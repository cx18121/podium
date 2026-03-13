// src/hooks/useSpeechCapture.test.ts
// AUD-01: Speech capture hook stubs
// These are Wave 0 todo stubs — implementation comes in plan 02-03

import { describe, it } from 'vitest';
import type {} from './useSpeechCapture';

describe('useSpeechCapture (AUD-01)', () => {
  it.todo('accumulates final transcript segments with relative timestamps');
  it.todo('auto-restarts recognition when onend fires while active');
  it.todo('stop() returns accumulated segments and sets active to false');
});
