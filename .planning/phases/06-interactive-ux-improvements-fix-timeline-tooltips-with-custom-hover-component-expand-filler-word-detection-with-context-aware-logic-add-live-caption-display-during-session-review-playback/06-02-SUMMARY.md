---
phase: 06-interactive-ux-improvements
plan: "02"
subsystem: analysis
tags: [filler-detection, nlp, context-aware, regex, vitest, tdd]

# Dependency graph
requires:
  - phase: 02-analysis-pipeline
    provides: detectFillers() and FillerEvent interface consumed unchanged
  - phase: 01-foundation-and-recording
    provides: TranscriptSegment type from useSpeechCapture
provides:
  - Expanded FILLER_PATTERNS covering 13 filler patterns (up from 4)
  - LINKING_VERBS Set for context-aware like suppression
  - SO_OBJECT_VERBS Set for context-aware so suppression
  - isLikeAFiller() pure function with linking verb / article / proper noun checks
  - isSoAFiller() pure function with object-verb context check
  - normalizeLabel() helper replacing naive repeated-char normalization
  - 12 unit tests (8 new) covering all new behaviors
affects:
  - Phase 03 scorecard scoring (fillerEvents count fed into aggregateScores)
  - Phase 06-03 live captions (transcripts processed by same detectFillers)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Context-aware filler suppression via word-index lookup from match.index
    - Ordered regex alternation for multi-word-before-sub-phrase priority
    - Targeted character normalization scoped to um+/uh+ only (not general words)

key-files:
  created: []
  modified:
    - src/analysis/fillerDetector.ts
    - src/analysis/fillerDetector.test.ts

key-decisions:
  - "[06-02] SO_OBJECT_VERBS suppression added: so after think/know/do/hope/say = not filler — preserves existing test and aligns with natural speech"
  - "[06-02] normalizeLabel() scoped to um+/uh+ only: general .replace(/(.)+/g,'$1') was collapsing ll in actually and basically to single l"
  - "[06-02] Pronoun I excluded from proper-noun suppression in isLikeAFiller: nextWord==='i' guard prevents like-I suppression"
  - "[06-02] Test input for you-know-what test fixed from 'you know what I mean' to 'you know what happened' to avoid i-mean overlap"

patterns-established:
  - "Context check functions (isLikeAFiller, isSoAFiller) accept pre-split words array — avoids re-splitting inside loop"
  - "Regex lastIndex=0 reset preserved immediately before while loop — stateful global regex safety pattern"

requirements-completed: [AUD-02]

# Metrics
duration: 7min
completed: "2026-03-16"
---

# Phase 06 Plan 02: Expanded Filler Detection Summary

**Filler pattern set expanded from 4 to 13 with context-aware like/so suppression — 'was like magic' and 'I think so' no longer flagged as fillers**

## Performance

- **Duration:** 7 min
- **Started:** 2026-03-16T04:37:38Z
- **Completed:** 2026-03-16T04:44:51Z
- **Tasks:** 2 (TDD RED + GREEN)
- **Files modified:** 2

## Accomplishments

- Expanded `FILLER_PATTERNS` regex from 4 to 13 patterns: added so, actually, basically, right, okay (single-word) and you know what, kind of, sort of, i mean (multi-word phrases)
- Added context-aware suppression for "like": linking verbs (was/is/feels/looks/seems/sounds), articles (a/an/the), and proper nouns no longer trigger false positives
- Added context-aware suppression for "so": object-verb contexts (think so, know so, do so, say so) are suppressed
- Fixed label normalization to only collapse repeated chars in um+/uh+ patterns — "actually" and "basically" now normalize correctly
- All 12 unit tests pass; full 378-test suite passes; TypeScript compiles clean

## Task Commits

1. **Task 1: Write failing tests for new filler behaviors (Wave 0 RED)** - `57e6d95` (test)
2. **Task 2: Implement expanded filler detection to make tests pass (GREEN)** - `deb94d1` (feat)

## Files Created/Modified

- `src/analysis/fillerDetector.ts` - Expanded from 39 to 145 lines: LINKING_VERBS, SO_OBJECT_VERBS, FILLER_PATTERNS (13 patterns), isLikeAFiller(), isSoAFiller(), normalizeLabel()
- `src/analysis/fillerDetector.test.ts` - Expanded from 46 to 130 lines: 8 new test cases covering all new filler behaviors and context-aware suppression

## Decisions Made

- `SO_OBJECT_VERBS` context check added (not in plan spec): "so" after think/know/do/hope/say is a pronoun/object, not a filler. Required to preserve existing test `'I um think so'` which expects exactly 1 event.
- `normalizeLabel()` replaces inline `.replace(/(.)\1+/g, '$1')`: scoped to um+/uh+ only — plan's normalization approach collapsed "ll" in "actually" and "basically".
- Pronoun "I" excluded from proper-noun suppression: `nextWord !== 'i'` guard in isLikeAFiller — without this, "like I was saying" was incorrectly suppressed.
- Test input for double-match test changed from `'you know what I mean'` to `'you know what happened'`: original test text contained "i mean" which is also a valid filler match, making a 1-event assertion incorrect.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Label normalization collapses word-internal repeated chars**
- **Found during:** Task 2 (GREEN implementation)
- **Issue:** Plan's inline `.replace(/(.)\1+/g, '$1')` applied to all matched text. "actually" → "actualy", "basically" → "basicaly" (both contain "ll")
- **Fix:** Introduced `normalizeLabel()` that only applies repeated-char collapse to `um+` and `uh+` patterns; all other labels returned as lowercase unchanged
- **Files modified:** src/analysis/fillerDetector.ts
- **Verification:** Test "detects new single-word fillers: so, actually, basically, right, okay" now passes — labels contain 'actually' and 'basically'
- **Committed in:** deb94d1

**2. [Rule 1 - Bug] "so" in "I um think so" triggers false positive against existing test**
- **Found during:** Task 2 (GREEN implementation)
- **Issue:** Expanding "so" as a filler pattern caused the existing test `'I um think so'` (expects 1 event: um) to return 2 events (um + so). "think so" uses "so" as a pronoun/object, not a discourse filler
- **Fix:** Added `SO_OBJECT_VERBS` Set (think, know, do, hope, say, believe, suppose + inflections) and `isSoAFiller()` function. "so" after an object-verb is suppressed
- **Files modified:** src/analysis/fillerDetector.ts
- **Verification:** All 4 original tests pass; "I um think so" returns 1 event
- **Committed in:** deb94d1

**3. [Rule 1 - Bug] Pronoun "I" triggers proper-noun suppression in isLikeAFiller**
- **Found during:** Task 2 (GREEN implementation)
- **Issue:** "like I was saying" — "I" is uppercase, triggering the proper noun check, suppressing "like" incorrectly. Test expects 1 filler event but got 0
- **Fix:** Added `nextWord !== 'i'` guard — the English pronoun "I" is a common word, not a proper noun
- **Files modified:** src/analysis/fillerDetector.ts
- **Verification:** Test "DOES flag 'like' at start of clause ('like I was saying')" now passes
- **Committed in:** deb94d1

**4. [Rule 1 - Bug] Test input for double-match test contained second filler phrase**
- **Found during:** Task 2 (GREEN implementation / RED test fix)
- **Issue:** New test `'you know what I mean'` expected 1 event but regex correctly matched both "you know what" AND "i mean" (2 valid fillers). Test assertion was wrong
- **Fix:** Changed test input to `'you know what happened'` — no other filler words present
- **Files modified:** src/analysis/fillerDetector.test.ts
- **Verification:** Test now correctly validates single "you know what" match without false double-match
- **Committed in:** deb94d1

---

**Total deviations:** 4 auto-fixed (all Rule 1 bugs)
**Impact on plan:** All auto-fixes were necessary for correctness. The plan's implementation spec had subtle edge cases in normalization, context suppression for "so", pronoun handling, and test input design. No scope creep — all fixes directly implement the plan's stated behavior.

## Issues Encountered

None beyond the auto-fixed bugs above.

## Next Phase Readiness

- fillerDetector.ts is ready for Phase 06-03 (live captions) — detectFillers() interface unchanged
- Expanded filler set will improve scorecard accuracy for all new session recordings
- Context-aware suppression reduces false positives that previously skewed filler scores

---
*Phase: 06-interactive-ux-improvements*
*Completed: 2026-03-16*
