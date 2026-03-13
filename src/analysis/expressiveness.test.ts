// src/analysis/expressiveness.test.ts
// VIS-03: Expressiveness analysis tests

import { describe, it, expect } from 'vitest';
import { scoreExpressiveness, aggregateExpressiveness } from './expressiveness';
import type { BlendshapeScore } from './expressiveness';

describe('expressiveness (VIS-03)', () => {
  it('returns 0 for all-zero blendshapes (flat delivery)', () => {
    const blendshapes: BlendshapeScore[] = [
      { categoryName: 'jawOpen', score: 0 },
      { categoryName: 'mouthSmileLeft', score: 0 },
      { categoryName: 'browInnerUp', score: 0 },
      { categoryName: 'cheekPuff', score: 0 },
    ];
    expect(scoreExpressiveness(blendshapes)).toBe(0);
  });

  it('returns value > 0.5 for animated face (jawOpen=1.0, mouthSmileLeft=0.8, browInnerUp=0.6)', () => {
    const blendshapes: BlendshapeScore[] = [
      { categoryName: 'jawOpen', score: 1.0 },
      { categoryName: 'mouthSmileLeft', score: 0.8 },
      { categoryName: 'browInnerUp', score: 0.6 },
    ];
    const score = scoreExpressiveness(blendshapes);
    expect(score).toBeGreaterThan(0.5);
  });

  it('returns 0 when only unknown blendshape names are present (filtered out)', () => {
    const blendshapes: BlendshapeScore[] = [
      { categoryName: '_neutral', score: 0.9 },
      { categoryName: 'eyeBlinkLeft', score: 0.7 },
      { categoryName: 'eyeBlinkRight', score: 0.6 },
    ];
    expect(scoreExpressiveness(blendshapes)).toBe(0);
  });

  it('returns 0 for empty blendshapes array', () => {
    expect(scoreExpressiveness([])).toBe(0);
  });

  it('aggregateExpressiveness returns average of frame scores', () => {
    const avg = aggregateExpressiveness([0.3, 0.5, 0.4]);
    expect(avg).toBeCloseTo(0.4, 5);
  });

  it('aggregateExpressiveness returns 0 for empty array', () => {
    expect(aggregateExpressiveness([])).toBe(0);
  });
});
