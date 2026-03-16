// src/analysis/fillerDetector.ts
// AUD-02: Detects filler word occurrences in final transcript segments.
//
// NOTE: Filler counts are LOWER BOUNDS — Chrome Web Speech API partially suppresses um/uh.
// (Phase 1 spike finding — see STATE.md Blockers section)
//
// Phase 6: Expanded from 4 patterns to 13 patterns. Context-aware "like" suppression
// reduces false positives for preference ("I like the pizza") and linking-verb constructions
// ("it was like magic"). Context-aware "so" suppression prevents false positives when
// "so" is used as pronoun/object ("I think so", "do so").

import type { TranscriptSegment } from '../hooks/useSpeechCapture';

export interface FillerEvent {
  type: 'filler_word';
  timestampMs: number;
  label: string; // 'um', 'uh', 'like', 'you know', 'so', 'actually', 'basically',
                 // 'right', 'okay', 'you know what', 'kind of', 'sort of', 'i mean'
}

// Linking verbs after which "like" is NOT a filler ("it was like magic" = simile/comparison)
const LINKING_VERBS = new Set([
  'was', 'is', 'are', 'were', 'be', 'been', 'being',
  'feel', 'feels', 'felt',
  'look', 'looks', 'looked',
  'seem', 'seems', 'seemed',
  'sound', 'sounds', 'sounded',
]);

// Verbs that take "so" as a pronoun/object — NOT a filler in these contexts
// ("I think so", "I hope so", "do so", "know so")
const SO_OBJECT_VERBS = new Set([
  'think', 'thinks', 'thought',
  'hope', 'hopes', 'hoped',
  'know', 'knows', 'knew',
  'say', 'says', 'said',
  'do', 'does', 'did',
  'believe', 'believes', 'believed',
  'suppose', 'supposes', 'supposed',
]);

// Multi-word phrases MUST appear before their sub-phrase alternations to get first-match priority.
// "you know what" before "you know" — prevents double-matching.
// /gi flags: case-insensitive + global (stateful — reset lastIndex=0 before every exec loop)
const FILLER_PATTERNS = /\b(you know what|you know|kind of|sort of|i mean|um+|uh+|like|so|actually|basically|right|okay)\b/gi;

/**
 * Returns true if a matched "like" at matchIndex in text is a filler usage.
 * NOT a filler when:
 *   - preceded by a linking verb ("was like", "feels like")
 *   - followed by an article ("like the", "like a", "like an") — preference context
 *   - followed by a capitalized word that is not the pronoun "I"
 */
function isLikeAFiller(text: string, matchIndex: number, words: string[]): boolean {
  // Find the word index corresponding to matchIndex by accumulating char lengths
  let charCount = 0;
  let wordIdx = -1;
  for (let i = 0; i < words.length; i++) {
    if (charCount <= matchIndex && matchIndex < charCount + words[i].length) {
      wordIdx = i;
      break;
    }
    charCount += words[i].length + 1; // +1 for the space separator
  }
  if (wordIdx === -1) return true; // fallback: treat as filler

  // Strip punctuation from adjacent words before comparison
  const prevWord = wordIdx > 0
    ? words[wordIdx - 1].toLowerCase().replace(/[^a-z]/g, '')
    : '';
  const nextWordRaw = wordIdx < words.length - 1 ? words[wordIdx + 1] : '';
  const nextWord = nextWordRaw.toLowerCase().replace(/[^a-z]/g, '');

  // NOT a filler if preceded by a linking verb
  if (LINKING_VERBS.has(prevWord)) return false;

  // NOT a filler if followed by an article (preference: "I like the/a/an ...")
  if (['a', 'an', 'the'].includes(nextWord)) return false;

  // NOT a filler if next raw word starts uppercase AND is not the pronoun "I"
  // The pronoun "I" is a common word, not a proper noun — don't suppress for it
  if (
    nextWordRaw.length > 0 &&
    nextWordRaw[0] === nextWordRaw[0].toUpperCase() &&
    nextWordRaw[0] !== nextWordRaw[0].toLowerCase() &&
    nextWord !== 'i' // "I" is the pronoun — not a proper noun
  ) {
    return false;
  }

  return true;
}

/**
 * Returns true if a matched "so" at matchIndex in text is a filler usage.
 * NOT a filler when preceded by a verb that takes "so" as object ("I think so").
 */
function isSoAFiller(matchIndex: number, words: string[]): boolean {
  // Find the word index corresponding to matchIndex
  let charCount = 0;
  let wordIdx = -1;
  for (let i = 0; i < words.length; i++) {
    if (charCount <= matchIndex && matchIndex < charCount + words[i].length) {
      wordIdx = i;
      break;
    }
    charCount += words[i].length + 1;
  }
  if (wordIdx === -1) return true; // fallback: treat as filler

  const prevWord = wordIdx > 0
    ? words[wordIdx - 1].toLowerCase().replace(/[^a-z]/g, '')
    : '';

  // NOT a filler if preceded by a verb that takes "so" as pronoun/object
  if (SO_OBJECT_VERBS.has(prevWord)) return false;

  return true;
}

/**
 * Normalize the filler label: collapse repeated characters only in um/uh patterns
 * (e.g. "umm" → "um", "uhh" → "uh"). Multi-word fillers and other words are unchanged.
 */
function normalizeLabel(rawMatch: string): string {
  const lower = rawMatch.toLowerCase();
  // Only apply repeated-char collapse to um+ and uh+ patterns
  if (/^um+$/.test(lower)) return 'um';
  if (/^uh+$/.test(lower)) return 'uh';
  return lower;
}

export function detectFillers(segments: TranscriptSegment[]): FillerEvent[] {
  const events: FillerEvent[] = [];
  const finalSegments = segments.filter(s => s.isFinal);

  for (const seg of finalSegments) {
    const words = seg.text.split(/\s+/);
    let match: RegExpExecArray | null;
    FILLER_PATTERNS.lastIndex = 0; // reset stateful global regex before each segment
    while ((match = FILLER_PATTERNS.exec(seg.text)) !== null) {
      const rawLabel = normalizeLabel(match[0]);

      // Context-aware suppression for "like"
      if (rawLabel === 'like' && !isLikeAFiller(seg.text, match.index, words)) {
        continue;
      }

      // Context-aware suppression for "so"
      if (rawLabel === 'so' && !isSoAFiller(match.index, words)) {
        continue;
      }

      events.push({
        type: 'filler_word',
        timestampMs: seg.timestampMs,
        label: rawLabel,
      });
    }
  }

  return events;
}
