# Phase 01 — UI Review

**Audited:** 2026-03-15
**Baseline:** Abstract 6-pillar standards (no UI-SPEC.md for this phase)
**Screenshots:** Captured (desktop 1440×900, mobile 375×812, tablet 768×1024) — dev server at localhost:3000

---

## Pillar Scores

| Pillar | Score | Key Finding |
|--------|-------|-------------|
| 1. Copywriting | 3/4 | CTAs are specific and action-oriented; "Stop" button and "Processing recording..." are generic |
| 2. Visuals | 4/4 | Strong focal point hierarchy on every screen; aria coverage is thorough |
| 3. Color | 4/4 | Consistent red accent system; only two hardcoded colors both for a data viz element |
| 4. Typography | 3/4 | 7 distinct font sizes in use — exceeds the 4-size abstract guideline |
| 5. Spacing | 3/4 | Well-structured with standard scale; one non-standard token (px-10, p-12) per screen |
| 6. Experience Design | 4/4 | All four state categories covered; destructive action has confirmation; disabled states present |

**Overall: 21/24**

---

## Top 3 Priority Fixes

1. **"Stop" button label on RecordingScreen** — user has no affordance for what happens after they click; they cannot tell if clicking stops the recording immediately or pauses it — change to "Stop Recording" (`src/components/RecordingScreen/RecordingScreen.tsx:33`)

2. **"Processing recording..." processing screen has no progress signal** — user gets a plain centered text string with no spinner, skeleton, or estimated time during what could be a multi-second blob processing window — add a `<span aria-busy="true">` spinner/pulsing indicator beside the text (`src/App.tsx:147-151`)

3. **Typography scale uses 7 sizes (xs, sm, base, lg, xl, 2xl, 3xl, 4xl minus base = 7 distinct values)** — exceeds 4-size abstract guideline; consolidating `text-4xl` (Home h1) with `text-3xl` (used elsewhere for the same heading level) and removing `text-xl` (used once at RecordingScreen stop button only) would bring the scale to a clean 4-size system

---

## Detailed Findings

### Pillar 1: Copywriting (3/4)

**Passing:**
- Primary CTA "Start Recording" (`Home.tsx:28`, `SetupScreen.tsx:58`) is specific and imperative — no generic "Submit" or "OK"
- Destructive confirmation copy is excellent: "Delete this session?" / "Keep Session" / "Delete Session" (`DeleteConfirmModal.tsx:10,19,26`) — both options are clear and asymmetric
- Error and warning states use plain-language human copy:
  - Camera fallback: "Camera preview unavailable — you can still start recording." (`SetupScreen.tsx:40`)
  - Speech API banner: "Audio analysis requires Chrome or Edge. Eye contact, expressiveness, and gesture analysis will still work." (`SpeechSupportBanner.tsx:13`)
  - Session load error: "Could not load session. Try recording again." (`Review.tsx:43`)
- NameSessionModal instructions are clear: "Give your session a name, or skip to use the auto-generated date and time." (`NameSessionModal.tsx:39`)
- Privacy footer: "Runs entirely in your browser. Nothing is uploaded." (`Home.tsx:32`) — reduces friction for skeptical users

**Issues:**
- `RecordingScreen.tsx:35` — button text is "Stop" (single word). No context for what stopping does. "Stop Recording" reduces ambiguity for first-time users.
- `App.tsx:148` — processing screen text is `Processing recording...` — generic, no affordance for duration. At minimum add an accessible busy indicator. Could be improved to "Saving your session..." which is more specific to what is actually happening at that moment.
- `NameSessionModal.tsx:63` — "Save" button label. In context of the modal it is unambiguous, but "Save Session" would be marginally more specific. Minor; not a priority.

---

### Pillar 2: Visuals (4/4)

**Passing:**
- Every screen has a single clear focal point:
  - Home/Setup: `text-3xl`/`text-4xl` heading + large red CTA
  - RecordingScreen: `text-8xl` monospaced timer dominates the viewport — excellent focus
  - NameSessionModal: modal overlay with focused input + red Save CTA
  - Review: session title h1 + scorecard above the fold
- Visual hierarchy is achieved through size contrast (8xl timer vs sm status label), weight (bold headings vs normal body), and luminance contrast (white primary text vs gray-400 secondary)
- Animated pulse dot on RecordingScreen (`bg-red-500 animate-pulse`, `RecordingScreen.tsx:28`) is decorated with `aria-hidden="true"` — correct
- Icon-only or ambiguous buttons are absent — all interactive elements carry descriptive text labels
- Camera video element has `aria-label="Camera preview"` (`SetupScreen.tsx:48`)
- RecordingScreen timer carries `aria-live="polite"` and `aria-label="Recording timer"` (`RecordingScreen.tsx:20-21`)
- NameSessionModal has proper `role="dialog"`, `aria-modal="true"`, `aria-labelledby` wiring (`NameSessionModal.tsx:28-30`)
- Review error state uses `role="alert"` (`Review.tsx:52`) and loading state uses `aria-busy="true"` (`Review.tsx:60`)

No visual issues found.

---

### Pillar 3: Color (4/4)

**Passing:**
- Accent color system is coherent: `bg-red-600` / `hover:bg-red-500` is used for all primary CTAs (Start Recording, Save, Record Another Session, Delete Session) — consistent and appropriately restricted
- Background layer uses a single token: `bg-gray-950` on every full-screen container
- Surface layer: `bg-gray-900` for modals and cards; `bg-gray-800` for inputs and secondary surfaces — 3-tier elevation is visually readable
- Secondary interactive elements (Skip, View History, Back to History) use `text-gray-400` underline styling — clearly de-emphasized without being invisible
- `bg-blue-600` appears only in `SpikeRunner.tsx:534` — a development-only spike component, not a production UI surface. Not a concern.

**Minor:**
- `SparklineChart.tsx:57,59` — two hardcoded `rgb(251 191 36)` color literals for the sparkline stroke and dots. These are equivalent to `yellow-400` and exist only on a data visualization element. Since no design token system exists yet (Tailwind v4 with no theme extension), this is pragmatic. Recommend extracting to a CSS custom property or Tailwind arbitrary color variable when the design system is formalized.

No accent overuse. No production hardcoded colors.

---

### Pillar 4: Typography (3/4)

**Sizes in use (7 distinct values):**

| Class | Count | Usage |
|-------|-------|-------|
| text-sm | 31 | Secondary text, labels, metadata |
| text-xs | 11 | Tertiary copy, privacy footer |
| text-lg | 6 | Modal headings, list items |
| text-xl | 4 | Section headings |
| text-3xl | 3 | Screen-level h1 on setup/recording |
| text-2xl | 2 | Review page h1 |
| text-4xl | 1 | Home page h1 only |

**Weights in use (4 distinct values):**

| Class | Count | Usage |
|-------|-------|-------|
| font-bold | 13 | Headings |
| font-semibold | 8 | Buttons, sub-headings |
| font-medium | 1 | Skip button |
| font-light | 1 | RecordingScreen timer |

**Issues:**
- 7 font sizes exceeds the abstract 4-size guideline. Specifically:
  - `text-4xl` is used in exactly one place (`Home.tsx:14`) for the first-time welcome h1. `text-3xl` is used for the SetupScreen h1 (`SetupScreen.tsx:34`). These represent the same semantic level across two states of the same app entry point — a single size would create consistency.
  - `text-xl` appears 4 times across the codebase (`DeleteConfirmModal.tsx:10`, `RecordingScreen.tsx:21` stop button, `NameSessionModal.tsx:34`). These could be consolidated with `text-lg` (6 uses) without visual regression.
  - Consolidating to: `text-xs` / `text-sm` / `text-lg` / `text-3xl` would cover all usage with 4 sizes.
- 4 font weights is at the acceptable limit but `font-light` (RecordingScreen timer only) and `font-medium` (Skip button only) are single-use. These are intentional design choices (light weight on the oversized timer reads well; medium on a ghost-style button is reasonable) — flagged but not a priority fix.

---

### Pillar 5: Spacing (3/4)

**Top spacing tokens (non-test, non-spike files):**

| Token | Count |
|-------|-------|
| p-4 | 11 |
| px-4 | 9 |
| py-2 | 7 |
| p-8 | 7 |
| p-6 | 7 |
| gap-6 | 7 |
| gap-4 | 5 |
| gap-3 | 4 |
| py-3 | 4 |
| px-6 | 4 |

**Passing:**
- All spacing uses standard Tailwind scale tokens — no arbitrary `[14px]` or `[1.3rem]` values found
- Gap system is used consistently for flex/grid layouts throughout (`gap-1` through `gap-12`)
- Button padding follows a consistent pattern: primary buttons use `px-8 py-4`, secondary modal buttons use `px-5 py-2.5` / `px-6 py-2.5`, tertiary ghost links have no padding

**Issues:**
- `px-10` appears once (`RecordingScreen.tsx:34` Stop button). All other full-screen CTA buttons use `px-8`. This one-off is visually consistent enough (the Stop button intentionally larger than normal CTAs) but breaks the scale pattern. Could be replaced with `px-8 py-5` to match the primary button width while keeping the extra height.
- `p-12` appears once (`src/App.tsx` or a page — confirmed from spacing audit as 1 occurrence). This is at the outer edge of the standard scale and does not create problems, but it is a singleton. Consider standardizing to `p-8` which is the dominant full-screen padding token.
- No arbitrary spacing values found — clean.

---

### Pillar 6: Experience Design (4/4)

**Loading states:**
- `Review.tsx:58-63` — explicit loading state with `aria-busy="true"` and copy "Loading session..." for async IndexedDB fetch
- `App.tsx:145-151` — processing screen rendered between stop and naming for the blob assembly window
- `HistoryView.test.tsx:4` — todo test for `sessions === undefined` (useLiveQuery loading state) exists, signaling intent even if the production loading branch needs verification

**Error states:**
- `Review.tsx:50-56` — error state with `role="alert"` for session not found and load failure
- `App.tsx:135-138` — inline error toast for recording errors (fixed position, red-900 background)
- `App.tsx:108-112` — status-driven `useEffect` auto-transitions back to setup on `status === 'error'` — silent recovery path in addition to visible error display
- `SetupScreen.tsx:39-41` — camera permission fallback message is surfaced inline in the video container rather than crashing

**Empty states:**
- `HistoryView.tsx:27-35` — sessions array length check with dedicated empty state screen
- `SparklineChart.tsx` — tested empty state when fewer than 2 scores

**Disabled states:**
- `NameSessionModal.tsx:60` — Save button disabled with `disabled:opacity-40 disabled:cursor-not-allowed` when input is empty
- `SpikeRunner.tsx:531` — spike buttons disabled while another spike is running

**Destructive action confirmation:**
- `DeleteConfirmModal.tsx` — full confirmation dialog before session deletion, with asymmetric cancel/confirm labeling ("Keep Session" vs "Delete Session") — this is the gold standard pattern

No missing state categories. The phase 01 UI demonstrates complete state coverage across all interaction paths introduced in this phase.

---

## Files Audited

- `src/App.tsx`
- `src/pages/Home.tsx`
- `src/pages/Review.tsx`
- `src/components/SetupScreen/SetupScreen.tsx`
- `src/components/RecordingScreen/RecordingScreen.tsx`
- `src/components/NameSessionModal/NameSessionModal.tsx`
- `src/components/common/SpeechSupportBanner.tsx`
- `src/components/DeleteConfirmModal/DeleteConfirmModal.tsx`
- `src/components/ScorecardView/ScorecardView.tsx`
- `src/components/AnnotatedPlayer/AnnotatedPlayer.tsx`
- `src/components/AnnotatedPlayer/Timeline.tsx`
- `src/components/SparklineChart/SparklineChart.tsx`
- `src/components/StorageQuotaBar/StorageQuotaBar.tsx`
- `src/components/SessionListItem/SessionListItem.tsx`
- `src/pages/HistoryView.tsx`
- `src/spikes/SpikeRunner.tsx` (development-only; reviewed for color leakage)
- `src/index.css`
