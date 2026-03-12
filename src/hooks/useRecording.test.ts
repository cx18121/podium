// src/hooks/useRecording.test.ts
import { describe, it } from 'vitest';

describe('useRecording — getUserMedia', () => {
  it.todo('calls getUserMedia with video and audio constraints');
});

describe('useRecording — stopRecording', () => {
  it.todo('calls webmFixDuration before saving to Dexie');
  it.todo('navigates to /review/:id after save completes');
});

describe('useRecording — saveSession', () => {
  it.todo('calls navigator.storage.persist after first save');
});
