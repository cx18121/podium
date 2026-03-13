// src/workers/mediapipe.worker.test.ts
// VIS-01: Worker message protocol tests
//
// Cannot test classic-mode worker in jsdom;
// tested manually via Chrome DevTools (VIS-01 manual gate in 02-VALIDATION.md)
// Classic-mode workers use importScripts() which is not available in Vitest's jsdom environment.

import { describe, it } from 'vitest';

describe('mediapipe.worker — message protocol (VIS-01)', () => {
  it.todo('postMessage { type: "init" } receives { type: "ready" } back (requires mocked MediaPipe)');
  it.todo('postMessage { type: "stop" } receives { type: "events", events: [] } when no frames processed');
  it.todo('postMessage { type: "frame", bitmap } receives { type: "frame_ack" } after processing');
});
