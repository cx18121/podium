// src/analysis/fillerDetector.ts
// AUD-02: Detects filler word occurrences in final transcript segments.
//
// NOTE: Filler counts are LOWER BOUNDS — Chrome Web Speech API partially suppresses um/uh.
// (Phase 1 spike finding — see STATE.md Blockers section)

import type { TranscriptSegment } from '../hooks/useSpeechCapture';

export interface FillerEvent {
  type: 'filler_word';
  timestampMs: number;
  label: string; // 'um', 'uh', 'like', 'you know'
}

// Regex matches common filler words. /gi flags for case-insensitive global matching.
// NOTE: The regex is stateful due to /g flag — reset lastIndex=0 before each exec loop
// to avoid the stateful global regex bug where alternating matches skip entries.
const FILLER_PATTERNS = /\b(um+|uh+|like|you know)\b/gi;

export function detectFillers(segments: TranscriptSegment[]): FillerEvent[] {
  const events: FillerEvent[] = [];
  const finalSegments = segments.filter(s => s.isFinal);

  for (const seg of finalSegments) {
    let match: RegExpExecArray | null;
    FILLER_PATTERNS.lastIndex = 0; // reset stateful global regex before each segment
    while ((match = FILLER_PATTERNS.exec(seg.text)) !== null) {
      events.push({
        type: 'filler_word',
        timestampMs: seg.timestampMs,
        // Normalize repeated characters: 'umm' -> 'um', 'uhh' -> 'uh'
        label: match[0].toLowerCase().replace(/(.)\1+/g, '$1'),
      });
    }
  }

  return events;
}
