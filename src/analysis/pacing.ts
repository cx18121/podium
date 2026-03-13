// src/analysis/pacing.ts
// AUD-03/AUD-04: Calculates words per minute and detects significant pauses
// from accumulated transcript segments.

import type { TranscriptSegment } from '../hooks/useSpeechCapture';

export interface PacingEvent {
  type: 'pause_detected' | 'wpm_snapshot';
  timestampMs: number;
  label?: string; // e.g. '45 wpm', '3.2s pause'
}

// Pause threshold: gaps longer than this between consecutive final segments are flagged.
const PAUSE_THRESHOLD_MS = 2000;

/**
 * Detects pauses between consecutive final transcript segments.
 * Segments are sorted by timestampMs before analysis — input order not assumed.
 */
export function detectPauses(segments: TranscriptSegment[]): PacingEvent[] {
  const events: PacingEvent[] = [];
  const finalSegments = segments
    .filter(s => s.isFinal)
    .sort((a, b) => a.timestampMs - b.timestampMs);

  for (let i = 1; i < finalSegments.length; i++) {
    const gap = finalSegments[i].timestampMs - finalSegments[i - 1].timestampMs;
    if (gap > PAUSE_THRESHOLD_MS) {
      events.push({
        type: 'pause_detected',
        timestampMs: finalSegments[i - 1].timestampMs,
        label: `${(gap / 1000).toFixed(1)}s pause`,
      });
    }
  }

  return events;
}

/**
 * Calculates words per minute from final transcript segments.
 * Returns 0 if session duration is 0 to avoid divide-by-zero.
 */
export function calculateWPM(
  segments: TranscriptSegment[],
  sessionDurationMs: number
): number {
  const allText = segments
    .filter(s => s.isFinal)
    .map(s => s.text)
    .join(' ');
  const wordCount = allText.trim().split(/\s+/).filter(Boolean).length;
  const minutes = sessionDurationMs / 60000;
  return minutes > 0 ? Math.round(wordCount / minutes) : 0;
}
