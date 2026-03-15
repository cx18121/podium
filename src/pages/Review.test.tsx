import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, waitFor } from '@testing-library/react';
import ReviewPage from './Review';
import { db } from '../db/db';
import type { Session } from '../db/db';

vi.mock('../components/ScorecardView/ScorecardView', () => ({
  default: () => <div data-testid="scorecard-view" />,
}));
vi.mock('../components/AnnotatedPlayer/AnnotatedPlayer', () => ({
  default: () => <div data-testid="annotated-player" />,
}));

beforeEach(() => {
  vi.stubGlobal('URL', {
    createObjectURL: vi.fn(() => 'blob:fake-url'),
    revokeObjectURL: vi.fn(),
  });
  window.HTMLMediaElement.prototype.play = vi.fn();
  window.HTMLMediaElement.prototype.pause = vi.fn();
  Object.defineProperty(window.HTMLMediaElement.prototype, 'duration', {
    get: () => 10,
    configurable: true,
  });
});

let sessionId: number;

beforeEach(async () => {
  await db.sessions.clear();
  sessionId = await db.sessions.add({
    title: 'Test session',
    createdAt: new Date(),
    durationMs: 60000,
    videoBlob: new Blob(['fake-video'], { type: 'video/webm' }),
    eventLog: [],
    scorecard: null,
  } as Omit<Session, 'id'>);
});

describe('ReviewPage — SCORE-03 persistence', () => {
  it('computes and persists scorecard to Dexie on first view (SCORE-03)', async () => {
    render(
      <ReviewPage sessionId={sessionId} onRecordAgain={() => {}} />
    );

    await waitFor(async () => {
      const stored = await db.sessions.get(sessionId);
      expect(stored?.scorecard).not.toBeNull();
      expect(typeof stored?.scorecard?.overall).toBe('number');
      expect(stored?.scorecard?.overall).toBeGreaterThanOrEqual(0);
      expect(stored?.scorecard?.overall).toBeLessThanOrEqual(100);
    }, { timeout: 3000 });
  });

  it('does not overwrite an existing scorecard on re-open (SCORE-03)', async () => {
    // Pre-seed with existing scorecard
    const existingScorecard = {
      overall: 77,
      dimensions: { eyeContact: 77, fillers: 77, pacing: 77, expressiveness: 77, gestures: 77 },
    };
    await db.sessions.update(sessionId, { scorecard: existingScorecard });

    render(
      <ReviewPage sessionId={sessionId} onRecordAgain={() => {}} />
    );

    // Wait for component to load
    await waitFor(async () => {
      const stored = await db.sessions.get(sessionId);
      // The existing scorecard should not have been replaced with a new computation
      expect(stored?.scorecard?.overall).toBe(77);
    }, { timeout: 3000 });
  });
});
