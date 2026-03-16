# Phase 6: Interactive UX Improvements - Context

**Gathered:** 2026-03-16
**Status:** Ready for planning

<domain>
## Phase Boundary

Three targeted improvements to the session review experience:
1. Replace native browser `title` tooltips on Timeline markers with a custom React tooltip component
2. Expand filler word detection with a broader word list and context-aware logic to reduce false positives on "like"
3. Add a toggleable live caption display during session review playback, synced to currentTimeMs

Schema change required (transcript persistence). No new pages or routes.

</domain>

<decisions>
## Implementation Decisions

### Tooltip Design
- Custom positioned `div` rendered via React state (not a library) — appears above the marker
- Dark bg (`bg-gray-800`), white text, small rounded corners, 150ms CSS delay via `transition-opacity`
- Triggered on `onMouseEnter` / `onMouseLeave` of the marker button
- Positioned absolutely relative to the Timeline container, horizontally clamped so it doesn't overflow viewport edges
- Remove the existing native `title` attribute from Timeline markers once custom tooltip is in place
- No tooltip library — keep it self-contained in Timeline.tsx

### Filler Word Expansion
- Expand FILLER_PATTERNS regex to include: `so`, `actually`, `basically`, `right`, `okay`, `you know what`, `kind of`, `sort of`, `i mean`
- **Context-aware "like"**: Do NOT flag "like" when it appears:
  - After a linking verb: `was like`, `is like`, `are like`, `feel like`, `looks like`, `seems like`, `sounds like`
  - Before a noun phrase or proper noun (e.g., "I like pizza")
  - Strategy: after regex match for "like", inspect the word immediately before (lookbehind for verb list) and word after (if it starts a noun phrase — starts with article `a/an/the` or capitalized = likely not filler)
  - DO flag "like" when: standalone between pauses, after a comma, at start of clause (e.g., "like, I think"), or mid-sentence with no verb before it
- Normalize all new words (same `.replace(/(.)\1+/g, '$1')` pattern)
- Update `FillerEvent.label` union type docs to reflect new words
- Keep lower-bound caveat comment — Chrome still suppresses some um/uh

### Caption Display
- Subtitle bar below the video, NOT overlaid on video (preserves video visual integrity)
- Toggle button labeled "CC" above or beside the caption bar — hidden by default, user activates
- Shows the current transcript segment text synced to `currentTimeMs` — find the segment whose `timestampMs` is closest to and ≤ current time
- Style: dark semi-transparent bar (`bg-gray-900/80`), white text `text-sm`, centered, min-height so bar doesn't collapse when no segment is active
- When no segment matches (before first or after last): show empty bar (no text), not hidden — avoids layout shift
- Caption state lives in `AnnotatedPlayer` (it already owns `currentTimeMs`)

### Transcript Storage
- Add `transcript: TranscriptSegment[]` field to `Session` interface in `db.ts`
- Bump Dexie to `db.version(2)` — no new indexes needed (arrays are never indexed per existing convention)
- `version(2).stores()` is identical to v1 since transcript is stored as data, not indexed
- Store transcript when session ends in the recording pipeline (`App.tsx` or wherever `db.sessions.add()` is called)
- Pass transcript down to `AnnotatedPlayer` as a new prop `transcript?: TranscriptSegment[]`
- Sessions recorded before this change will have `transcript: undefined` — caption bar shows "No transcript available" in that case

### Claude's Discretion
- Exact pixel dimensions and spacing of tooltip arrow indicator (if any)
- How to handle tooltip positioning near left/right edges of the Timeline
- Whether to add a keyboard shortcut for CC toggle (e.g., `c` key)

</decisions>

<canonical_refs>
## Canonical References

No external specs — requirements are fully captured in decisions above.

### Key source files downstream agents must read
- `src/analysis/fillerDetector.ts` — current filler detection implementation to extend
- `src/components/AnnotatedPlayer/Timeline.tsx` — current title-based tooltip to replace
- `src/components/AnnotatedPlayer/AnnotatedPlayer.tsx` — owns currentTimeMs, needs caption bar + transcript prop
- `src/db/db.ts` — Session schema to extend with transcript field (Dexie v2 migration)
- `src/hooks/useSpeechCapture.ts` — TranscriptSegment type definition, capture logic
- `src/App.tsx` — where sessions are saved to DB; needs transcript passed through

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `Timeline.tsx` marker buttons already have `z-10`, `aria-label`, `onMouseEnter`-compatible structure — tooltip layer can attach here
- `AnnotatedPlayer.tsx` already tracks `currentTimeMs` via `onTimeUpdate` and passes it to Timeline — same state drives caption sync
- `TranscriptSegment` type from `useSpeechCapture.ts`: `{ text: string; timestampMs: number; isFinal: boolean }`
- Dexie version pattern established: v1 schema in `db.ts` — just bump to v2 with same stores() string

### Established Patterns
- Tailwind-only styling (no CSS modules, no styled-components)
- No tooltip or popover library in the project — don't add one
- All analysis functions in `src/analysis/` as pure functions with test coverage
- `isFinal: true` filtering in fillerDetector — only final segments are analyzed
- `z-10` used for layering interactive elements above progress fills

### Integration Points
- `App.tsx` calls `db.sessions.add()` — transcript array must be included here
- `Review.tsx` constructs `<AnnotatedPlayer>` — will need to pass `transcript` from `session` object
- `AnnotatedPlayer.tsx` → `Timeline.tsx` prop chain already established; tooltip is internal to Timeline

</code_context>

<specifics>
## Specific Ideas

- For "like" context detection: simple lookbehind word check (split text into words array, check index-1 against verb list) is sufficient — no NLP library needed
- Caption bar should feel like YouTube's CC bar: always-present container that fills with text when available
- The CC toggle button should be visually subtle — small, `text-xs`, positioned to not distract from video

</specifics>

<deferred>
## Deferred Ideas

- Whisper.wasm for offline transcription (more accurate than Web Speech API) — v2 backlog item already noted in STATE.md
- Word-level caption highlighting (bold the current word) — would require word-level timestamps from a more capable ASR
- Export transcript as text file — separate feature phase

</deferred>

---

*Phase: 06-interactive-ux-improvements*
*Context gathered: 2026-03-16*
