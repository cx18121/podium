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

  it('stores and retrieves a transcript array', async () => {
    const id = await db.sessions.add({
      title: 'Transcript test',
      createdAt: new Date(),
      durationMs: 10000,
      videoBlob: new Blob(['test'], { type: 'video/webm' }),
      eventLog: [],
      scorecard: null,
      transcript: [{ text: 'hello world', timestampMs: 1000, isFinal: true }],
    });
    const session = await db.sessions.get(id);
    expect(session?.transcript).toEqual([
      { text: 'hello world', timestampMs: 1000, isFinal: true },
    ]);
  });

  it('allows sessions without transcript (backward compatibility)', async () => {
    const id = await db.sessions.add({
      title: 'Legacy session',
      createdAt: new Date(),
      durationMs: 5000,
      videoBlob: new Blob(['test'], { type: 'video/webm' }),
      eventLog: [],
      scorecard: null,
    });
    const session = await db.sessions.get(id);
    expect(session?.transcript).toBeUndefined();
  });

  it('stores and retrieves wpmWindows array', async () => {
    const wpmWindows = [
      { startMs: 0, endMs: 30000, wpm: 120, wordCount: 60 },
      { startMs: 30000, endMs: 60000, wpm: 90, wordCount: 45 },
    ];
    const id = await db.sessions.add({
      title: 'WPM windows test',
      createdAt: new Date(),
      durationMs: 60000,
      videoBlob: new Blob(['test'], { type: 'video/webm' }),
      eventLog: [],
      scorecard: null,
      wpmWindows,
    });
    const session = await db.sessions.get(id);
    expect(session?.wpmWindows).toEqual(wpmWindows);
  });

  it('stores and retrieves whisperFillers object', async () => {
    const whisperFillers = { byType: { um: 5, uh: 3, like: 2 } };
    const id = await db.sessions.add({
      title: 'Whisper test',
      createdAt: new Date(),
      durationMs: 30000,
      videoBlob: new Blob(['test'], { type: 'video/webm' }),
      eventLog: [],
      scorecard: null,
      whisperFillers,
    });
    const session = await db.sessions.get(id);
    expect(session?.whisperFillers).toEqual(whisperFillers);
  });

  it('stores and retrieves whisperStatus string', async () => {
    const id = await db.sessions.add({
      title: 'Whisper status test',
      createdAt: new Date(),
      durationMs: 30000,
      videoBlob: new Blob(['test'], { type: 'video/webm' }),
      eventLog: [],
      scorecard: null,
      whisperStatus: 'complete',
    });
    const session = await db.sessions.get(id);
    expect(session?.whisperStatus).toBe('complete');
  });

  it('returns undefined for new optional fields when not provided', async () => {
    const id = await db.sessions.add({
      title: 'Legacy-style session',
      createdAt: new Date(),
      durationMs: 5000,
      videoBlob: new Blob(['test'], { type: 'video/webm' }),
      eventLog: [],
      scorecard: null,
    });
    const session = await db.sessions.get(id);
    expect(session?.wpmWindows).toBeUndefined();
    expect(session?.whisperFillers).toBeUndefined();
    expect(session?.whisperStatus).toBeUndefined();
  });

  it('database version is at least 3', () => {
    expect(db.verno).toBeGreaterThanOrEqual(3);
  });
});
