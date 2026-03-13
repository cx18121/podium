// src/analysis/pacing.test.ts
// AUD-03/AUD-04: Pacing and pause detection stubs
// These are Wave 0 todo stubs — implementation comes in plan 02-03

import { describe, it } from 'vitest';
import type {} from './pacing';

describe('pacing (AUD-03/AUD-04)', () => {
  it.todo('calculateWPM returns correct WPM for known word count and duration');
  it.todo('detectPauses returns pause_detected event for gaps > 2000ms');
  it.todo('detectPauses ignores gaps <= 2000ms');
});
