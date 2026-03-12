// src/db/db.ts
import Dexie, { type EntityTable } from 'dexie';

export interface Session {
  id: number;
  title: string;          // auto date/time or user custom name; renameable (Phase 4)
  createdAt: Date;
  durationMs: number;
  videoBlob: Blob;        // NOT indexed — never add to stores() index string
  eventLog: SessionEvent[]; // Phase 2 will push entries; initialized as []
  scorecard: Scorecard | null; // Phase 3 will write this; initialized as null
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

export { db };
