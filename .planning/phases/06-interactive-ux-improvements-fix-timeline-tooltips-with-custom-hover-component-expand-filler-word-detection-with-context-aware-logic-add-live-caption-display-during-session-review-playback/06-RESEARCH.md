# Phase 06: Interactive UX Improvements - Research

**Researched:** 2026-03-16
**Domain:** React state management, regex NLP, Dexie schema migration, CSS positioning
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Tooltip Design**
- Custom positioned `div` rendered via React state (not a library) — appears above the marker
- Dark bg (`bg-gray-800`), white text, small rounded corners, 150ms CSS delay via `transition-opacity`
- Triggered on `onMouseEnter` / `onMouseLeave` of the marker button
- Positioned absolutely relative to the Timeline container, horizontally clamped so it doesn't overflow viewport edges
- Remove the existing native `title` attribute from Timeline markers once custom tooltip is in place
- No tooltip library — keep it self-contained in Timeline.tsx

**Filler Word Expansion**
- Expand FILLER_PATTERNS regex to include: `so`, `actually`, `basically`, `right`, `okay`, `you know what`, `kind of`, `sort of`, `i mean`
- Context-aware "like": Do NOT flag "like" when it appears after a linking verb (`was like`, `is like`, `are like`, `feel like`, `looks like`, `seems like`, `sounds like`), or before a noun phrase (e.g., "I like pizza")
- DO flag "like" when: standalone between pauses, after a comma, at start of clause, or mid-sentence with no verb before it
- Strategy: after regex match for "like", inspect the word immediately before (lookbehind for verb list) and word after (if it starts with article `a/an/the` or is capitalized = likely not filler)
- Normalize all new words (same `.replace(/(.)\1+/g, '$1')` pattern)
- Update `FillerEvent.label` union type docs to reflect new words
- Keep lower-bound caveat comment

**Caption Display**
- Subtitle bar below the video, NOT overlaid
- Toggle button labeled "CC" — hidden by default, user activates
- Shows the current transcript segment text synced to `currentTimeMs` — find the segment whose `timestampMs` is closest to and ≤ current time
- Style: dark semi-transparent bar (`bg-gray-900/80`), white text `text-sm`, centered, min-height so bar doesn't collapse
- When no segment matches: show empty bar (no text) to avoid layout shift
- Caption state lives in `AnnotatedPlayer`

**Transcript Storage**
- Add `transcript: TranscriptSegment[]` field to `Session` interface in `db.ts`
- Bump Dexie to `db.version(2)` — no new indexes needed
- `version(2).stores()` is identical to v1
- Store transcript when session ends in `App.tsx` where `db.sessions.add()` is called
- Pass transcript down to `AnnotatedPlayer` as a new prop `transcript?: TranscriptSegment[]`
- Sessions recorded before this change will have `transcript: undefined` — caption bar shows "No transcript available"

### Claude's Discretion
- Exact pixel dimensions and spacing of tooltip arrow indicator (if any)
- How to handle tooltip positioning near left/right edges of the Timeline
- Whether to add a keyboard shortcut for CC toggle (e.g., `c` key)

### Deferred Ideas (OUT OF SCOPE)
- Whisper.wasm for offline transcription
- Word-level caption highlighting (requires word-level timestamps)
- Export transcript as text file
</user_constraints>

---

## Summary

Phase 06 has three independent sub-features: (1) replace native browser `title` tooltips on Timeline markers with a custom positioned React element, (2) expand filler word detection with a broader word list and context-aware "like" suppression, and (3) add a live caption bar below the video that syncs to `currentTimeMs` using stored transcript segments.

All three are self-contained within existing files. The tooltip lives entirely inside `Timeline.tsx`. The filler detector expansion lives entirely in `fillerDetector.ts` and its tests. The caption system requires a Dexie v2 schema migration, a prop addition to `AnnotatedPlayer`, and a storage call addition in `App.tsx`. No new routes, no new pages, no external libraries.

The most technically subtle piece is the context-aware "like" detection: the regex must remain stateful-safe (existing `lastIndex=0` reset pattern is critical to preserve), and the context-check logic operates on the word array derived by splitting the segment text — not a secondary regex pass.

**Primary recommendation:** Implement as three separate plans in sequence — tooltip, filler expansion, then captions (captions last because they require the schema migration which invalidates existing db.test.ts fixtures).

---

## Standard Stack

### Core (all already present in the project)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| React | 18+ | useState for tooltip/caption visibility, onMouseEnter/Leave handlers | Already in project |
| Tailwind v4 | via @tailwindcss/vite | All styling — bg-gray-800, transition-opacity, bg-gray-900/80 | Project-locked, no config file |
| Dexie.js | 3.x | IndexedDB ORM, schema versioning | Already powering sessions table |
| Vitest | via vite.config.ts | Unit tests for fillerDetector changes | Already configured, pool: vmThreads |

### No New Dependencies

All three features are implemented using only existing project libraries. No tooltip library, no NLP library, no caption library should be added.

## Architecture Patterns

### Recommended Project Structure

No new files are strictly required. Changes are spread across existing files:

```
src/
├── analysis/
│   ├── fillerDetector.ts          # Expand FILLER_PATTERNS, add like-context logic
│   └── fillerDetector.test.ts     # New tests for context-aware cases
├── components/AnnotatedPlayer/
│   ├── Timeline.tsx               # Remove title attr, add tooltip state + div
│   └── AnnotatedPlayer.tsx        # Add transcript prop, caption state, CC toggle + bar
├── db/
│   └── db.ts                      # Add transcript field to Session, bump to version(2)
└── App.tsx                        # Pass segments to db.sessions.add()
```

### Pattern 1: Custom Tooltip via React State in Timeline.tsx

**What:** A single `useState<number | null>` (storing the hovered event index) controls which tooltip is visible. The tooltip renders as an absolutely-positioned `div` inside the Timeline container.

**When to use:** When you want no library dependency and tooltip content is simple text. Appropriate here because Timeline.tsx is a single-purpose component.

**Critical implementation notes:**
- The Timeline container div already has `relative` class implied by its structure. Verify it has `relative` positioning before adding the absolute tooltip child.
- The marker button's `left` position is computed as `calc(${leftPct}% - 8px)`. The tooltip `left` must be derived from the same `leftPct` and then clamped to avoid viewport overflow.
- Clamping strategy: `Math.max(0, Math.min(leftPct, 90))` as a percentage, or compute pixel position via `getBoundingClientRect()` on `onMouseEnter`. The simpler approach: clamp percentage and accept slight imprecision at extreme edges.
- Remove `title={eventLabel(event)}` from the marker button once the custom tooltip is in place (the native title creates a competing tooltip).
- `aria-label` stays on the button — it provides accessibility without creating a visual tooltip.
- The 150ms CSS transition delay prevents flicker when the mouse briefly passes over markers during scrubbing.

**Example structure:**
```tsx
// Inside Timeline component:
const [tooltipIndex, setTooltipIndex] = useState<number | null>(null);

// On each marker button:
onMouseEnter={() => setTooltipIndex(i)}
onMouseLeave={() => setTooltipIndex(null)}

// Tooltip div (inside Timeline container, after the marker):
{tooltipIndex === i && (
  <div
    className="absolute bottom-full mb-2 px-2 py-1 bg-gray-800 text-white text-xs rounded pointer-events-none whitespace-nowrap z-20 transition-opacity opacity-100"
    style={{ left: `clamp(0px, calc(${leftPct}% - 8px), calc(100% - 120px))` }}
  >
    {eventLabel(event)}
  </div>
)}
```

### Pattern 2: Context-Aware "Like" Detection in fillerDetector.ts

**What:** After the global regex matches "like", inspect the surrounding word context by splitting the segment text into a words array and checking the word at `match.index - 1` words back.

**Critical implementation notes:**

The current FILLER_PATTERNS regex uses the `/g` flag which makes it stateful. The existing `lastIndex = 0` reset before each segment is correct and MUST be preserved. Any refactoring that changes the while-loop structure must maintain this reset.

Context-aware "like" cannot be done with a pure regex lookbehind because the verb list is long and some cases require checking the word AFTER "like" (noun phrase detection). Splitting into words is the correct approach.

**Algorithm:**
```
1. Global regex matches "like" in segment.text at character position match.index
2. Split segment.text by whitespace into words[]
3. Find which word index corresponds to match.index (walk words, accumulate char lengths)
4. Check words[wordIndex - 1] against LINKING_VERBS set: ['was', 'is', 'are', 'feel', 'feels', 'felt', 'looks', 'look', 'seems', 'seem', 'sounds', 'sound']
   - If match → NOT a filler, skip
5. Check words[wordIndex + 1]:
   - If starts with 'a', 'an', 'the' (case-insensitive) → likely "I like the..." (preference) → NOT filler
   - If first char is uppercase and wordIndex > 0 → proper noun after "like" → NOT filler
6. Otherwise → IS a filler, push FillerEvent
```

**Edge cases to handle:**
- "like" at index 0 of words array: no previous word → no verb → IS filler
- "like" at last index: no next word → check only previous → apply only verb lookbehind rule
- "like," (with punctuation attached): the regex `\b` handles word boundaries; the words array may have "like," as a token — strip punctuation when comparing `words[wordIndex+1]`
- Multiple "like" occurrences in one segment: the while loop correctly iterates all matches; the words array is computed once per segment (or per match is fine too since text doesn't change)

**New words to add to FILLER_PATTERNS:**
```
so, actually, basically, right, okay, you know what, kind of, sort of, i mean
```

Note: `you know what`, `kind of`, `sort of`, `i mean` are multi-word phrases. The current FILLER_PATTERNS uses `\b` word boundaries. Multi-word phrases need their own alternation: `\b(you know what|you know|kind of|sort of|i mean|so|actually|basically|right|okay|um+|uh+|like)\b`. Order matters — longer phrases before shorter overlapping ones (`you know what` before `you know`).

**Normalization:** The `.replace(/(.)\1+/g, '$1')` pattern applies to the matched string. For multi-word filler phrases, the whole match is the label. "kind of" with no repeated chars normalizes to "kind of" unchanged — that is correct behavior.

### Pattern 3: Dexie v2 Schema Migration

**What:** Add `transcript` field to `Session` interface and bump the Dexie version number.

**Critical implementation notes:**

Dexie's versioning model: `db.version(N).stores({...})` describes the schema at version N. The browser upgrades automatically when the version number increases. The `stores()` string only lists INDEXED fields — unindexed data fields (like `videoBlob`, `eventLog`, `scorecard`, and now `transcript`) do NOT appear in the stores string.

The correct Dexie v2 upgrade:
```typescript
db.version(1).stores({
  sessions: '++id, createdAt, title',
});
db.version(2).stores({
  sessions: '++id, createdAt, title',  // identical — no new indexes
});
```

**Why both version blocks are needed:** Dexie requires the version history to be declared for upgrade path integrity. Removing v1 and only declaring v2 could cause "IDBDatabase: The database connection is closing" or version mismatch errors on browsers that already have v1 stored.

**TypeScript interface update:**
```typescript
import type { TranscriptSegment } from '../hooks/useSpeechCapture';

export interface Session {
  // ...existing fields...
  transcript?: TranscriptSegment[]; // undefined for sessions recorded before v2
}
```

The `?` optional field means `db.sessions.add()` in `App.tsx` doesn't require transcript for the type to compile — but it should always be provided going forward.

**db.test.ts impact:** Existing tests call `db.sessions.add()` without a `transcript` field. Since it's optional (`?`), existing tests compile and pass without changes. One new test should verify that transcript is stored and retrieved correctly.

### Pattern 4: Caption Bar in AnnotatedPlayer.tsx

**What:** Below the `<Timeline>`, add a caption bar that shows the current transcript segment text. Controlled by a `showCaptions` boolean state. A CC button toggles it.

**Time-sync algorithm:**
```typescript
function getCurrentCaption(
  transcript: TranscriptSegment[],
  currentTimeMs: number
): string | null {
  // Find the last segment whose timestampMs <= currentTimeMs
  // (segments are in chronological order from SpeechCapture)
  const active = transcript
    .filter(s => s.isFinal && s.timestampMs <= currentTimeMs)
    .at(-1);  // Array.at(-1) supported in all modern browsers
  return active?.text ?? null;
}
```

**Layout structure:**
```tsx
<div className="flex flex-col gap-2 w-full max-w-2xl">
  <div className="relative group w-full max-w-2xl">
    {/* video + overlay button */}
  </div>
  <Timeline ... />

  {/* CC toggle + caption bar */}
  <div className="flex flex-col gap-1">
    <button
      onClick={() => setShowCaptions(c => !c)}
      className="self-end text-xs px-2 py-1 rounded bg-gray-700 hover:bg-gray-600 text-gray-300 transition-colors"
      aria-label={showCaptions ? "Hide captions" : "Show captions"}
      aria-pressed={showCaptions}
    >
      CC
    </button>
    {showCaptions && (
      <div
        className="w-full min-h-[2.5rem] bg-gray-900/80 rounded px-4 py-2 text-sm text-white text-center flex items-center justify-center"
        aria-live="polite"
        aria-atomic="true"
      >
        {transcript === undefined
          ? <span className="text-gray-500">No transcript available</span>
          : <span>{currentCaption ?? ''}</span>
        }
      </div>
    )}
  </div>
</div>
```

**aria-live="polite":** Required for screen readers to announce caption changes. `polite` doesn't interrupt other announcements. `aria-atomic="true"` means the whole region is announced, not just the changed text portion. This is the correct pattern for live caption regions.

**Prop addition to AnnotatedPlayer:**
```typescript
interface AnnotatedPlayerProps {
  videoUrl: string;
  durationMs: number;
  events: SessionEvent[];
  transcript?: TranscriptSegment[];  // new
}
```

**Review.tsx update:** Pass `session.transcript` to `AnnotatedPlayer`:
```tsx
<AnnotatedPlayer
  videoUrl={videoUrl}
  durationMs={session.durationMs}
  events={session.eventLog}
  transcript={session.transcript}
/>
```

### Anti-Patterns to Avoid

- **Re-creating FILLER_PATTERNS inside the while loop:** The regex with `/g` flag must be declared once at module level and reset with `lastIndex = 0` before each segment. Creating it inside the loop avoids the stale-lastIndex bug but causes a new RegExp object per segment — either approach works, but the existing module-level pattern with reset is the established pattern.
- **Adding the transcript to the Dexie stores() index string:** Transcript is an array — arrays cannot be Dexie indexes. Adding it would throw at DB open time.
- **Overlay positioning for captions:** Overlaid text on video degrades readability against bright backgrounds. The decision is a subtitle bar below the video — do not change this.
- **Using `position: fixed` for tooltip:** Fixed positioning breaks the left-percentage math since it's relative to viewport, not the Timeline container. Use `position: absolute` with the container as reference.
- **Hiding the caption bar container entirely when no caption is active:** This causes layout shift. Always render the bar with `min-h-[2.5rem]` and show empty content.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Tooltip positioning library | Custom overflow detection viewport math | CSS `clamp()` on left percentage | Sufficient for this use case; library adds complexity |
| NLP library for "like" detection | spaCy / compromise.js | Simple word-array index check | The context rules are deterministic and limited; no ML needed |
| Custom DB migration system | Hand-rolled upgrade scripts | Dexie's built-in version() upgrade path | Dexie handles version negotiation, blocked events, upgrade transactions |

---

## Common Pitfalls

### Pitfall 1: Stateful Global Regex lastIndex Not Reset

**What goes wrong:** The FILLER_PATTERNS regex has the `/g` flag, making it stateful. If `lastIndex` is not reset to 0 before each `while` loop, subsequent segments skip the first match(es) because lastIndex is left at the end-of-string position from the previous segment.

**Why it happens:** JavaScript global regex objects remember their last match position. After `exec()` reaches the end of a string and returns `null`, `lastIndex` resets to 0 automatically — but only for that string. Switching to a new string without resetting causes incorrect behavior.

**How to avoid:** The existing `FILLER_PATTERNS.lastIndex = 0;` line before each segment loop MUST be preserved in all refactored versions. If FILLER_PATTERNS is expanded to include multi-word alternations, this reset remains required.

**Warning signs:** Tests that check a specific filler count return one fewer than expected on the second segment processed.

### Pitfall 2: Multi-Word Filler Phrases Break \b Anchoring

**What goes wrong:** Adding `you know what` to a `\b...\b` pattern where the pattern contains spaces — `\b(you know what)\b` — works because `\b` only anchors at the start and end of the full group, not around internal spaces.

**Why it happens:** Developers assume `\b` must wrap every word boundary within the phrase.

**How to avoid:** Test `you know what` in the regex before shipping. The pattern `\b(you know what)\b` correctly matches the phrase surrounded by word boundaries. Also ensure `you know what` appears BEFORE `you know` in the alternation — regex alternation is left-to-right first-match, so the longer phrase must be listed first.

**Warning sign:** "you know what" triggers two matches: "you know" and "what" separately — indicates wrong alternation order.

### Pitfall 3: Dexie Version(1) Block Must Remain

**What goes wrong:** Developer removes the `db.version(1).stores(...)` block when adding `db.version(2).stores(...)`, causing Dexie to throw when upgrading existing v1 databases.

**Why it happens:** Seems redundant to keep both.

**How to avoid:** Keep both version blocks. Dexie requires the full version history to be declared to handle upgrades. The v1 block is needed for browsers that currently have a v1 database.

**Warning sign:** `UpgradeError: The database is already at a higher version` or "blocked" errors in the console when the test suite runs with fake-indexeddb.

### Pitfall 4: Tooltip z-index Conflict

**What goes wrong:** The tooltip `div` appears behind the Timeline container's progress fill or other markers due to stacking context.

**Why it happens:** The Timeline's `relative` container may create a stacking context. The marker buttons have `z-10`. The tooltip needs `z-20` (or higher) to appear above all markers.

**How to avoid:** Give the tooltip `z-20` class. Because it renders inside the `relative` container, absolute positioning works correctly and z-index is within that context.

**Warning sign:** Tooltip appears clipped or invisible behind adjacent markers.

### Pitfall 5: Caption Time-Sync Off by One

**What goes wrong:** Caption shows the segment that starts AFTER the current time rather than the one currently being spoken.

**Why it happens:** Using `find()` (first match) instead of finding the LAST segment whose timestamp ≤ current time.

**How to avoid:** Filter for `timestampMs <= currentTimeMs`, then take the last element. `transcript.filter(s => s.isFinal && s.timestampMs <= currentTimeMs).at(-1)` is correct.

**Warning sign:** Captions appear to lead the audio by one segment.

### Pitfall 6: Like Context Check on Punctuation-Attached Words

**What goes wrong:** The words array from `text.split(/\s+/)` produces `["like,"]` — the word after punctuation. Checking `words[wordIndex+1].startsWith('a')` passes even when the next word is "and" (which is a filler context, not a noun phrase).

**Why it happens:** Not stripping trailing punctuation from word tokens.

**How to avoid:** When checking the word after "like" for noun-phrase detection, strip leading/trailing punctuation: `words[wordIndex + 1]?.replace(/^[^a-zA-Z]+|[^a-zA-Z]+$/g, '')`. Then check for articles or capitalization.

---

## Code Examples

### Filler Detection with Context-Aware Like (verified against existing code structure)

```typescript
// src/analysis/fillerDetector.ts — pattern after expansion

const LINKING_VERBS = new Set([
  'was', 'is', 'are', 'were', 'be', 'been', 'being',
  'feel', 'feels', 'felt',
  'look', 'looks', 'looked',
  'seem', 'seems', 'seemed',
  'sound', 'sounds', 'sounded',
]);

// Multi-word phrases BEFORE their sub-phrases to ensure correct alternation matching
const FILLER_PATTERNS = /\b(you know what|you know|kind of|sort of|i mean|um+|uh+|like|so|actually|basically|right|okay)\b/gi;

function isLikeAFiller(text: string, matchIndex: number): boolean {
  const words = text.split(/\s+/);
  // Find which word index corresponds to matchIndex
  let charCount = 0;
  let wordIdx = -1;
  for (let i = 0; i < words.length; i++) {
    if (charCount <= matchIndex && matchIndex < charCount + words[i].length) {
      wordIdx = i;
      break;
    }
    charCount += words[i].length + 1; // +1 for space
  }
  if (wordIdx === -1) return true; // fallback: treat as filler

  const prevWord = wordIdx > 0 ? words[wordIdx - 1].toLowerCase().replace(/[^a-z]/g, '') : '';
  const nextWord = wordIdx < words.length - 1
    ? words[wordIdx + 1].toLowerCase().replace(/[^a-z]/g, '')
    : '';

  // NOT a filler if preceded by a linking verb
  if (LINKING_VERBS.has(prevWord)) return false;

  // NOT a filler if followed by article (preference: "I like the/a/an ...")
  if (['a', 'an', 'the'].includes(nextWord)) return false;

  // NOT a filler if next word starts uppercase (proper noun)
  const rawNext = wordIdx < words.length - 1 ? words[wordIdx + 1] : '';
  if (rawNext.length > 0 && rawNext[0] === rawNext[0].toUpperCase() && rawNext[0] !== rawNext[0].toLowerCase()) {
    return false;
  }

  return true;
}
```

### Dexie v2 Migration (verified against existing db.ts)

```typescript
// src/db/db.ts — additions only

export interface Session {
  id: number;
  title: string;
  createdAt: Date;
  durationMs: number;
  videoBlob: Blob;
  eventLog: SessionEvent[];
  scorecard: Scorecard | null;
  transcript?: TranscriptSegment[]; // Phase 6: undefined for pre-v2 sessions
}

// Keep v1 block for upgrade path from existing browsers
db.version(1).stores({
  sessions: '++id, createdAt, title',
});

// v2: adds transcript field as data (NOT indexed — never add arrays to stores())
db.version(2).stores({
  sessions: '++id, createdAt, title',
});
```

### App.tsx Session Save with Transcript

```typescript
// In handleSaveName, after deriving segments:
const segments = speechCaptureRef.current?.stop() ?? [];
// ...existing filler/pause/wpm event computation...

const sessionId = await db.sessions.add({
  title,
  createdAt: new Date(),
  durationMs,
  videoBlob: fixedBlob,
  eventLog,
  scorecard: null,
  transcript: segments, // Phase 6: persist for caption display
});
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Native browser `title` tooltip | Custom React state tooltip | Phase 06 | Consistent styling, 150ms delay, no OS-level rendering |
| Flat filler regex (4 words) | Context-aware regex + word inspection (13+ patterns) | Phase 06 | Fewer false positives on "like", broader detection |
| No transcript persistence | TranscriptSegment[] stored in Session | Phase 06 | Enables live captions, future word-level features |

---

## Open Questions

1. **CC toggle keyboard shortcut**
   - What we know: CONTEXT.md marks this as Claude's discretion
   - What's unclear: Whether to implement or skip for this phase
   - Recommendation: Skip for Phase 06 — adds complexity (global keydown listener, focus management) with minimal benefit for a feature hidden by default. Defer to a future accessibility pass.

2. **Tooltip edge-clamping pixel accuracy**
   - What we know: CSS `clamp()` on percentage works for the middle 90% of the timeline. Extreme edges (first/last 5%) may still clip.
   - What's unclear: Whether the final 5% case is worth pixel-level measurement via `getBoundingClientRect()`
   - Recommendation: Use CSS percentage clamping (`clamp(0px, calc(${leftPct}% - 8px), calc(100% - 120px))`) as a first pass. If testing reveals clipping, add a `ref` to the tooltip to measure and adjust.

3. **"right" and "okay" false positives**
   - What we know: "right" and "okay" appear frequently in non-filler contexts ("that's right", "okay let me start")
   - What's unclear: Whether context-aware suppression should also be applied to these words
   - Recommendation: Ship them as unconditional fillers per the locked decision. The CONTEXT.md explicitly includes them in the expanded list without a context-awareness carveout. Revisit if user testing shows high false-positive rates.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest (via vite.config.ts) |
| Config file | vite.config.ts (`test.pool: vmThreads`) |
| Quick run command | `npx vitest run src/analysis/fillerDetector.test.ts` |
| Full suite command | `npx vitest run` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| AUD-02 | Expanded filler words detected | unit | `npx vitest run src/analysis/fillerDetector.test.ts` | ✅ exists, needs new cases |
| AUD-02 | "like" after linking verb NOT flagged | unit | `npx vitest run src/analysis/fillerDetector.test.ts` | ❌ Wave 0 gap |
| AUD-02 | "like" before article NOT flagged | unit | `npx vitest run src/analysis/fillerDetector.test.ts` | ❌ Wave 0 gap |
| AUD-02 | Multi-word phrases detected ("you know what", "kind of") | unit | `npx vitest run src/analysis/fillerDetector.test.ts` | ❌ Wave 0 gap |
| PLAY-04 | Timeline markers show custom tooltip on hover | manual | n/a — jsdom cannot test hover positioning | manual gate |
| REC-05 | Transcript field stored and retrieved from Dexie | unit | `npx vitest run src/db/db.test.ts` | ❌ Wave 0 gap |
| PLAY-01 | Caption bar renders with correct text at current time | unit | `npx vitest run` (if AnnotatedPlayer.test added) | ❌ Wave 0 gap (optional) |

### Sampling Rate
- **Per task commit:** `npx vitest run src/analysis/fillerDetector.test.ts`
- **Per wave merge:** `npx vitest run`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] New test cases in `src/analysis/fillerDetector.test.ts` — cover "like" context suppression (verb lookbehind, article lookahead), multi-word fillers ("you know what", "kind of"), new word detection ("so", "actually", etc.)
- [ ] New test in `src/db/db.test.ts` — verify `transcript` field round-trips through Dexie v2

*(Caption bar time-sync logic is a pure function candidate — if extracted, add unit test. If inline in component, manual gate is acceptable.)*

---

## Sources

### Primary (HIGH confidence)
- Direct source file inspection: `src/analysis/fillerDetector.ts` — current regex pattern, lastIndex reset, normalization
- Direct source file inspection: `src/components/AnnotatedPlayer/Timeline.tsx` — current title attr, marker structure, z-10 usage
- Direct source file inspection: `src/components/AnnotatedPlayer/AnnotatedPlayer.tsx` — currentTimeMs state, prop interface
- Direct source file inspection: `src/db/db.ts` — version(1) schema, Session interface
- Direct source file inspection: `src/App.tsx` — db.sessions.add() call site, segments derivation
- Direct source file inspection: `vite.config.ts` — pool: vmThreads, jsdom environment
- CONTEXT.md decisions section — all locked implementation choices

### Secondary (MEDIUM confidence)
- Dexie.js versioning model: version history must be kept intact for upgrade paths — consistent with Dexie v3 docs patterns observed in db.test.ts using fake-indexeddb
- `aria-live="polite"` + `aria-atomic="true"` for caption regions — established ARIA pattern for live text regions
- JavaScript global regex `lastIndex` behavior — language spec behavior, HIGH confidence

### Tertiary (LOW confidence)
- None — all claims are verifiable from the source code or language/spec behavior

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libraries confirmed present in source files and package.json
- Architecture: HIGH — based on direct source inspection of all six key files
- Pitfalls: HIGH — based on direct code reading of existing patterns (lastIndex reset, z-10, Dexie version patterns)

**Research date:** 2026-03-16
**Valid until:** 2026-04-16 (stable tech — Dexie, React, Tailwind APIs are stable)
