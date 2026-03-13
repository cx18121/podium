// src/analysis/expressiveness.ts
// VIS-03: Facial expressiveness scoring from FaceLandmarker blendshapes
// Blendshapes relevant to expressiveness (excludes eye-look blendshapes used for eye contact)

const EXPRESSION_BLENDSHAPES = [
  'browDownLeft', 'browDownRight', 'browInnerUp', 'browOuterUpLeft', 'browOuterUpRight',
  'cheekPuff', 'cheekSquintLeft', 'cheekSquintRight',
  'jawOpen', 'jawForward',
  'mouthSmileLeft', 'mouthSmileRight', 'mouthFrownLeft', 'mouthFrownRight',
  'mouthOpen', 'mouthPucker', 'mouthFunnel',
];

export interface BlendshapeScore {
  categoryName: string;
  score: number; // 0-1
}

/**
 * Returns a single expressiveness score 0-1 for this frame.
 * Uses RMS of relevant blendshape scores — punishes flat (all near 0) delivery.
 */
export function scoreExpressiveness(blendshapes: BlendshapeScore[]): number {
  if (!blendshapes || blendshapes.length === 0) return 0;

  const relevant = blendshapes.filter(b => EXPRESSION_BLENDSHAPES.includes(b.categoryName));
  if (relevant.length === 0) return 0;

  // Sum of squares of all relevant blendshape scores — punishes flat (all near 0)
  const sumSq = relevant.reduce((acc, b) => acc + b.score * b.score, 0);
  // Normalize: sqrt of mean squared value (RMS), clamped to 0-1
  return Math.min(1, Math.sqrt(sumSq / relevant.length));
}

/**
 * Aggregate frame scores over a segment (e.g., every 5 seconds).
 * Returns simple average of frame scores, or 0 for empty input.
 */
export function aggregateExpressiveness(frameScores: number[]): number {
  if (frameScores.length === 0) return 0;
  return frameScores.reduce((a, b) => a + b, 0) / frameScores.length;
}
