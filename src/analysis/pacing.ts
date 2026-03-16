// src/analysis/pacing.ts
// AUD-03/AUD-04: Calculates words per minute and detects significant pauses
// from accumulated transcript segments.

import type { TranscriptSegment } from '../hooks/useSpeechCapture';
import type { WPMWindow } from '../db/db';

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

/**
 * Buckets final transcript segments into 30-second windows and computes WPM per window.
 * FOUND-02: Called at session end, result stored in session.wpmWindows for Phase 12 chart.
 *
 * Algorithm:
 * 1. Filter to isFinal segments only
 * 2. Assign each to bucket Math.floor(timestampMs / 30000)
 * 3. Count words per bucket, compute WPM with duration clamped to durationMs
 * 4. Return sorted by startMs ascending
 *
 * Missing windows (speaker silent for 30s+) are NOT gap-filled — Phase 12 handles display gaps.
 */
export function calculateWPMWindows(
  segments: TranscriptSegment[],
  durationMs: number
): WPMWindow[] {
  const finalSegments = segments.filter(s => s.isFinal);
  if (finalSegments.length === 0) return [];

  const buckets = new Map<number, string[]>();
  for (const seg of finalSegments) {
    const idx = Math.floor(seg.timestampMs / 30000);
    if (!buckets.has(idx)) buckets.set(idx, []);
    buckets.get(idx)!.push(seg.text);
  }

  const windows: WPMWindow[] = [];
  for (const [idx, texts] of buckets) {
    const startMs = idx * 30000;
    const endMs = Math.min((idx + 1) * 30000, durationMs);
    const windowDurationMs = endMs - startMs;
    const wordCount = texts.join(' ').trim().split(/\s+/).filter(Boolean).length;
    const wpm = windowDurationMs > 0
      ? Math.round(wordCount / (windowDurationMs / 60000))
      : 0;
    windows.push({ startMs, endMs, wpm, wordCount });
  }

  return windows.sort((a, b) => a.startMs - b.startMs);
}
