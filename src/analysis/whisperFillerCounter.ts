// src/analysis/whisperFillerCounter.ts
// WHIS-01: Count filler words from Whisper ASR transcript text.
// Extracted as pure function for unit testing (worker cannot run in jsdom).

const WHISPER_FILLER_PATTERNS: Record<string, RegExp> = {
  um: /\bum+\b/gi,
  uh: /\buh+\b/gi,
  like: /\blike\b/gi,
  'you know': /\byou know\b/gi,
  hmm: /\bhmm+\b/gi,
  so: /\bso\b/gi,
  actually: /\bactually\b/gi,
  basically: /\bbasically\b/gi,
};

export function countFillersFromTranscript(text: string): Record<string, number> {
  const byType: Record<string, number> = {};
  for (const [label, pattern] of Object.entries(WHISPER_FILLER_PATTERNS)) {
    const matches = text.match(pattern);
    if (matches && matches.length > 0) {
      byType[label] = matches.length;
    }
  }
  return byType;
}
