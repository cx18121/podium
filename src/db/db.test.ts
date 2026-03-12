// src/db/db.test.ts
import { beforeEach, describe, expect, it } from 'vitest';
import 'fake-indexeddb/auto';
import { db } from './db';

describe('Dexie sessions table', () => {
  beforeEach(async () => {
    await db.sessions.clear();
  });

  it('has a sessions table', () => {
    expect(db.sessions).toBeTruthy();
  });

  it('saves a session and returns a numeric id', async () => {
    const id = await db.sessions.add({
      title: 'Test session',
      createdAt: new Date(),
      durationMs: 30000,
      videoBlob: new Blob(['test'], { type: 'video/webm' }),
      eventLog: [],
      scorecard: null,
    });
    expect(typeof id).toBe('number');
    expect(id).toBeGreaterThan(0);
  });

  it('retrieves a session with all required fields', async () => {
    const createdAt = new Date();
    const id = await db.sessions.add({
      title: 'March 12, 2026 — 3:41 PM',
      createdAt,
      durationMs: 60000,
      videoBlob: new Blob(['video'], { type: 'video/webm' }),
      eventLog: [],
      scorecard: null,
    });
    const session = await db.sessions.get(id);
    expect(session?.title).toBe('March 12, 2026 — 3:41 PM');
    expect(session?.durationMs).toBe(60000);
    expect(session?.eventLog).toEqual([]);
    expect(session?.scorecard).toBeNull();
  });

  it('stores and retrieves a videoBlob', async () => {
    const blob = new Blob(['fake-video-data'], { type: 'video/webm' });
    const id = await db.sessions.add({
      title: 'Blob test',
      createdAt: new Date(),
      durationMs: 5000,
      videoBlob: blob,
      eventLog: [],
      scorecard: null,
    });
    const session = await db.sessions.get(id);
    // fake-indexeddb serializes Blob as a plain object in jsdom; verify the field is stored
    expect(session?.videoBlob).toBeDefined();
    expect(session?.videoBlob).not.toBeNull();
  });
});
