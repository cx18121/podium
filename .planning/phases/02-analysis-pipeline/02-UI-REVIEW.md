# Phase 02 — UI Review

**Audited:** 2026-03-15
**Baseline:** Abstract 6-pillar standards (no UI-SPEC exists for this phase)
**Screenshots:** Not captured (dev server at port 3000 belongs to a different project; pitch-practice server not running — code-only audit)

---

## Pillar Scores

| Pillar | Score | Key Finding |
|--------|-------|-------------|
| 1. Copywriting | 3/4 | CTAs are specific and action-oriented; one generic "Save" label and a vague "Stop" button are minor gaps |
| 2. Visuals | 3/4 | Clear focal point on each screen; RecordingScreen's "Stop" lacks visual weight relative to its importance |
| 3. Color | 3/4 | Consistent red-600 accent throughout; two hardcoded `rgb()` values in SparklineChart break token discipline |
| 4. Typography | 3/4 | Seven font sizes in use exceeds the 4-size guideline; weights are disciplined (4 weights, all purposeful) |
| 5. Spacing | 4/4 | No arbitrary values found; Tailwind scale used consistently; spacing frequency distribution is coherent |
| 6. Experience Design | 4/4 | Loading, error, empty, and disabled states all present and well-handled across every view |

**Overall: 20/24**

---

## Top 3 Priority Fixes

1. **Seven font sizes in use** — Users perceive visual noise and lack of hierarchy when too many size steps compete — Consolidate `text-8xl` (RecordingScreen timer) down to `text-6xl` or promote it intentionally; audit whether `text-3xl`, `text-4xl`, and `text-2xl` can collapse to two steps (e.g., `text-3xl` display, `text-xl` section heading).

2. **Hardcoded `rgb(251 191 36)` in SparklineChart** — If the design system color changes, the sparkline color will be left behind silently — Replace with a Tailwind class: `stroke-yellow-400` on the `<path>` and `fill-yellow-400` on `<circle>` elements (SparklineChart.tsx lines 57, 59).

3. **"Save" and "Stop" are generic labels** — These labels tell users *what to press* but not *what happens* — In NameSessionModal change "Save" → "Save Session"; in RecordingScreen change "Stop" → "Stop Recording" to match the surrounding "Recording" context label already on screen.

---

## Detailed Findings

### Pillar 1: Copywriting (3/4)

**Passing patterns:**

- Home.tsx: "Start Recording" — specific, action-forward CTA
- RecordingScreen.tsx: "Recording" status label and aria-label "Recording timer" — clear context
- HistoryView.tsx: "Record New Session" — consistently named across two call sites (empty state + populated state)
- DeleteConfirmModal.tsx: "Keep Session" / "Delete Session" — excellent specificity, avoids generic "Cancel" / "OK"
- HistoryView.tsx empty state: "Record your first session to see your history here." — directs action, not just states absence
- SparklineChart.tsx: "Record more sessions to see trends" — constructive empty state copy
- Review.tsx error: "Could not load session. Try recording again." — specific and actionable

**Issues:**

- `NameSessionModal.tsx:63` — Button label is "Save". At this point in the flow the user has just finished recording and is naming their session — "Save Session" would match the mental model and be consistent with "Keep Session" / "Delete Session" in DeleteConfirmModal.
- `RecordingScreen.tsx:33` — Button label is "Stop". The screen already shows "Recording" as a status badge, but the CTA should be self-contained. "Stop Recording" removes any ambiguity if the button is seen in isolation (e.g. reduced-motion, screen reader, thumbnail).
- `ScorecardView.tsx:28` — Section heading is "Your Session Scorecard" (lowercase "sm" label). Not incorrect but the contrast with the `text-3xl font-bold` overall score below it is stark — the heading reads more like a caption than a section title.

### Pillar 2: Visuals (3/4)

**Passing patterns:**

- **Home:** Single full-screen centered layout with one `text-4xl font-bold` heading and a red-600 CTA — clear focal hierarchy.
- **RecordingScreen:** Intentionally minimal — `text-8xl` timer is the undisputed focal point. The pulsing red dot + "Recording" label provides persistent context without competing.
- **HistoryView:** Three-layer hierarchy — session list (primary), progress sparklines (secondary), StorageQuotaBar (tertiary). Visually distinguishable.
- **ScorecardView:** Overall score (`text-3xl font-bold`) leads; five dimension rows with score bars follow — coherent reading order.
- **Aria coverage:** All interactive icons have `aria-label`; timeline event markers have both `title` and `aria-label`; progress/meter roles are correctly applied.

**Issues:**

- **RecordingScreen "Stop" button** (`RecordingScreen.tsx:32-37`): The button uses `bg-gray-800 hover:bg-gray-700 border border-gray-600` — a visually recessive style. Given that stopping a recording is the only available action on this screen and is the primary user goal, the button should carry the visual weight of a primary action. The current styling matches a secondary/ghost button pattern. Suggest `bg-red-600 hover:bg-red-500` consistent with the app's primary CTA pattern (all other primary actions use red-600).
- **NameSessionModal "Skip" button** (`NameSessionModal.tsx:52-57`): `text-gray-400 hover:text-white` — ghost text. This is appropriate as a de-emphasized secondary action. No change needed.
- **No icon-only buttons found** — all interactive controls have visible text labels. No icon-without-label risk.

### Pillar 3: Color (3/4)

**Token discipline:**

- `text-primary` / `bg-primary` / `border-primary` usage: **0 occurrences** — the codebase uses Tailwind semantic names directly (red-600, gray-950, gray-900, gray-700, gray-400, white). This is consistent, not a sign of missing tokens.
- Red-600 accent is used on: home CTA, HistoryView "Record New Session" (×2), RecordingScreen timer text, RecordingScreen pulse dot, NameSessionModal save button, ScorecardView score bars, ReviewPage "Record Another Session". That is ~8 distinct accent usages — under the 10-element flag threshold.
- All other colors are gray-scale neutrals — no competing accent colors.

**Issues:**

- `SparklineChart.tsx:57` — `stroke="rgb(251 191 36)"` (amber/yellow): hardcoded RGB. Not referenced from Tailwind config.
- `SparklineChart.tsx:59` — `fill="rgb(251 191 36)"`: same hardcoded value repeated.

The sparkline amber color is a second accent color that exists only in SparklineChart. While the color choice itself is reasonable (yellow distinguishes sparklines from the red primary accent), the hardcoded `rgb()` form breaks with the Tailwind token system. Use `className` with `stroke-yellow-400` and `fill-yellow-400` instead, or define a CSS custom property in `index.css`.

### Pillar 4: Typography (3/4)

**Font sizes in use (7 total):**

| Class | Location | Purpose |
|-------|----------|---------|
| `text-xs` | Labels, metadata, captions | Tertiary text |
| `text-sm` | Body, buttons, form hints | Secondary text |
| `text-lg` | Home body paragraph | Mid-emphasis |
| `text-xl` | Page headings (Review, HistoryView, NameSessionModal) | Section heading |
| `text-2xl` | Review page session title | Page title |
| `text-3xl` | ScorecardView overall score | Display emphasis |
| `text-4xl` | Home primary heading | Hero headline |

`text-8xl` is used in RecordingScreen for the timer but was missed by the class grep (the grep pattern captures xs through 5xl). Adding it brings the count to **8 font sizes** in active use — two above the 4-size abstract standard flag threshold.

**Font weights in use (4 total):** `font-light`, `font-medium`, `font-semibold`, `font-bold` — all four are purposeful and well-distributed. Weight discipline is strong.

**Issue:** The scale from `text-xs` through `text-8xl` spans 8 steps. For a single-page app with ~5 screen types, 5-6 sizes would suffice. The `text-lg` (Home body) and `text-2xl` (Review title) slots could be collapsed: `text-base` for body and `text-xl` for all page-level headings. The `text-3xl` overall score could become `text-2xl`. The `text-8xl` timer is intentional (maximum possible size for a solo focal point) and should be kept.

### Pillar 5: Spacing (4/4)

**No arbitrary spacing values found.** Every spacing class uses standard Tailwind scale integers.

**Top spacing classes by frequency:**

| Class | Count | Context |
|-------|-------|---------|
| `px-4` | 9 | List padding, modal inputs |
| `py-2` | 7 | Button vertical padding |
| `gap-4` | 7 | Card/section gaps |
| `p-8` | 6 | Page-level padding |
| `gap-1` | 6 | Tight label pairs |
| `px-6` | 4 | Button horizontal padding |
| `p-4` | 4 | Card inner padding |
| `gap-6` | 4 | Section-level gaps |

The distribution is coherent: `p-8` / `gap-6` for page-level breathing room, `p-4`/`p-6` for card interiors, `py-2`/`px-4` for tight controls. No outlier one-off values. The `py-5` and `px-5` single appearances (NameSessionModal) are defensible and do not indicate inconsistency — they provide a slightly larger hit target for the primary Save button.

### Pillar 6: Experience Design (4/4)

**Loading states:**

- `HistoryView.tsx:19-25` — `aria-busy="true"` + "Loading sessions…" while Dexie query is pending
- `Review.tsx:58-64` — `aria-busy="true"` + "Loading session…" while session fetch is in progress
- `ScorecardView.tsx:17-23` — `aria-busy="true"` + "Calculating scores…" while scorecard is null

**Error states:**

- `Review.tsx:50-56` — `role="alert"` div with specific error message and human-friendly copy ("Try recording again.")
- `App.tsx:107-115` — Status-driven fallback: if `status === 'error'` while in processing/recording view, resets to home
- `App.tsx:135-137` — Inline error display: `{error && <div>{error}</div>}` — error from useRecording hook surfaced to user

**Empty states:**

- `HistoryView.tsx:27-40` — "No sessions yet" with explanatory copy and a direct "Record New Session" CTA — full empty state pattern
- `SparklineChart.tsx:33-45` — "Record more sessions to see trends" for insufficient data state
- `ScorecardView.tsx:45` — `{dim.detail ?? 'Insufficient data'}` — graceful fallback for missing scorecard dimension detail

**Disabled states:**

- `NameSessionModal.tsx:60` — Save button `disabled={name.trim().length === 0}` with `disabled:opacity-40 disabled:cursor-not-allowed` — clear visual feedback

**Destructive action confirmation:**

- `DeleteConfirmModal` — Full confirmation modal before delete, with "Keep Session" (safe) and "Delete Session" (destructive red-600) — correctly designed

**Interaction completeness:** Every screen has all three states covered (loading, error, populated/empty). No uncovered interaction gaps found.

---

## Files Audited

- `/home/cx3429/School/cs_misc/pitch-practice/src/App.tsx`
- `/home/cx3429/School/cs_misc/pitch-practice/src/pages/Home.tsx`
- `/home/cx3429/School/cs_misc/pitch-practice/src/pages/Review.tsx`
- `/home/cx3429/School/cs_misc/pitch-practice/src/pages/HistoryView.tsx`
- `/home/cx3429/School/cs_misc/pitch-practice/src/components/RecordingScreen/RecordingScreen.tsx`
- `/home/cx3429/School/cs_misc/pitch-practice/src/components/NameSessionModal/NameSessionModal.tsx`
- `/home/cx3429/School/cs_misc/pitch-practice/src/components/DeleteConfirmModal/DeleteConfirmModal.tsx`
- `/home/cx3429/School/cs_misc/pitch-practice/src/components/ScorecardView/ScorecardView.tsx`
- `/home/cx3429/School/cs_misc/pitch-practice/src/components/SparklineChart/SparklineChart.tsx`
- `/home/cx3429/School/cs_misc/pitch-practice/src/components/StorageQuotaBar/StorageQuotaBar.tsx`
- `/home/cx3429/School/cs_misc/pitch-practice/src/components/AnnotatedPlayer/AnnotatedPlayer.tsx`
- `/home/cx3429/School/cs_misc/pitch-practice/src/components/AnnotatedPlayer/Timeline.tsx`
- `/home/cx3429/School/cs_misc/pitch-practice/src/components/common/SpeechSupportBanner.tsx`
- `/home/cx3429/School/cs_misc/pitch-practice/src/components/SessionListItem/SessionListItem.tsx`
- `/home/cx3429/School/cs_misc/pitch-practice/src/components/SetupScreen/SetupScreen.tsx`
- Phase SUMMARY and PLAN files: 02-01, 02-02, 02-03
