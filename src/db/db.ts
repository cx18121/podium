// src/db/db.ts
import Dexie, { type EntityTable } from 'dexie';
import type { TranscriptSegment } from '../hooks/useSpeechCapture';

export interface Session {
  id: number;
  title: string;          // auto date/time or user custom name; renameable (Phase 4)
  createdAt: Date;
  durationMs: number;
  videoBlob: Blob;        // NOT indexed — never add to stores() index string
  eventLog: SessionEvent[]; // Phase 2 will push entries; initialized as []
  scorecard: Scorecard | null; // Phase 3 will write this; initialized as null
  transcript?: TranscriptSegment[]; // Phase 6: undefined for sessions recorded before v2
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

export { db };
