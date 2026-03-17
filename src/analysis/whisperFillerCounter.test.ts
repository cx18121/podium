// src/analysis/whisperFillerCounter.test.ts
import { describe, it, expect } from 'vitest';
import { countFillersFromTranscript } from './whisperFillerCounter';

describe('countFillersFromTranscript', () => {
  it('counts basic fillers from transcript text', () => {
    const result = countFillersFromTranscript('umm yeah like I think');
    expect(result.um).toBe(1);
    expect(result.like).toBe(1);
  });

  it('returns empty object for text with no fillers', () => {
    const result = countFillersFromTranscript('The quick brown fox jumps over the lazy dog');
    expect(Object.keys(result)).toHaveLength(0);
  });

  it('returns empty object for empty string', () => {
    const result = countFillersFromTranscript('');
    expect(Object.keys(result)).toHaveLength(0);
  });

  it('counts multiple occurrences of same filler', () => {
    const result = countFillersFromTranscript('um I think um that um is right');
    expect(result.um).toBe(3);
  });

  it('counts "you know" as a single filler pattern', () => {
    const result = countFillersFromTranscript('you know I think you know it works');
    expect(result['you know']).toBe(2);
  });

  it('is case-insensitive', () => {
    const result = countFillersFromTranscript('Um I think UH that Like yeah');
    expect(result.um).toBe(1);
    expect(result.uh).toBe(1);
    expect(result.like).toBe(1);
  });

  it('counts hmm filler', () => {
    const result = countFillersFromTranscript('hmm let me think hmmm about that');
    expect(result.hmm).toBe(2);
  });

  it('handles transcript with only fillers', () => {
    const result = countFillersFromTranscript('um uh like you know');
    expect(result.um).toBe(1);
    expect(result.uh).toBe(1);
    expect(result.like).toBe(1);
    expect(result['you know']).toBe(1);
  });
});
