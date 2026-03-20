// src/db/db.ts
import Dexie, { type EntityTable } from 'dexie';
import type { TranscriptSegment } from '../hooks/useSpeechCapture';

export interface CalibrationProfile {
  id?: number;
  createdAt: Date;
  gazeThreshold: number;
  faceTouchThreshold: number;
  swayThreshold: number;
}

export interface WPMWindow {
  startMs: number;    // window start (e.g. 0, 30000, 60000)
  endMs: number;      // window end (clamped to session duration)
  wpm: number;        // words per minute for this window
  wordCount: number;  // raw word count for this window
}

/** Phase 13 stub — byType maps filler label to count (e.g. { um: 5, uh: 3 }) */
export interface WhisperFillerResult {
  byType: Record<string, number>;
}

export interface Session {
  id: number;
  title: string;          // auto date/time or user custom name; renameable (Phase 4)
  createdAt: Date;
  durationMs: number;
  videoBlob: Blob;        // NOT indexed — never add to stores() index string
  eventLog: SessionEvent[]; // Phase 2 will push entries; initialized as []
  scorecard: Scorecard | null; // Phase 3 will write this; initialized as null
  transcript?: TranscriptSegment[]; // Phase 6: undefined for sessions recorded before v2
  wpmWindows?: WPMWindow[];                 // Phase 8 — FOUND-02
  whisperFillers?: WhisperFillerResult;      // Phase 13 — WHIS-01
  whisperStatus?: 'pending' | 'complete' | 'failed'; // Phase 13 — WHIS-03
}

export interface SessionEvent {
  type: string;           // e.g. 'eye_contact_break', 'filler_word', 'gesture'
  timestampMs: number;
  label?: string;         // e.g. 'um', 'uh'
}

export interface Scorecard {
  overall: number;                       // 0–100
  dimensions: Record<string, number>;    // e.g. { eyeContact: 82, fillers: 65 }
}

const db = new Dexie('CognitiveLoadMapper') as Dexie & {
  sessions: EntityTable<Session, 'id'>;
  calibrationProfiles: EntityTable<CalibrationProfile, 'id'>;
};

// v1 schema: index only metadata columns, NEVER binary or array fields
db.version(1).stores({
  sessions: '++id, createdAt, title',
  // videoBlob, eventLog, scorecard are stored as data but not indexed
});

// v2 schema: adds transcript field as unindexed data — stores() string is identical.
// Both version blocks are required for Dexie to handle upgrade from v1 browsers.
// NEVER add transcript to the index string — arrays cannot be Dexie indexes.
db.version(2).stores({
  sessions: '++id, createdAt, title',
});

// v3 schema: adds wpmWindows, whisperFillers, whisperStatus as unindexed data.
// FOUND-01: v1.0 sessions cleared on upgrade — no backward compatibility required.
// All three version blocks must remain for Dexie upgrade machinery.
db.version(3).stores({
  sessions: '++id, createdAt, title',
}).upgrade(tx => {
  return tx.table('sessions').clear();
});

// v4 schema: adds calibrationProfiles table for per-user threshold calibration.
// Purely additive — no upgrade callback, no session clearing.
db.version(4).stores({
  sessions: '++id, createdAt, title',
  calibrationProfiles: '++id',
});

export { db };
