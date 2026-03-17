// src/analysis/wpmChart.test.ts
import { describe, it, expect } from 'vitest';
import { computeWPMChartData } from './wpmChart';
import type { WPMWindow } from '../db/db';

function makeWindow(startMs: number, wpm: number): WPMWindow {
  return { startMs, endMs: startMs + 30000, wpm, wordCount: Math.round(wpm * 0.5) };
}

describe('computeWPMChartData', () => {
  it('returns [] for empty windows array', () => {
    expect(computeWPMChartData([])).toEqual([]);
  });

  it('returns label "0:00" for window at startMs=0', () => {
    const result = computeWPMChartData([makeWindow(0, 120)]);
    expect(result).toEqual([{ label: '0:00', wpm: 120 }]);
  });

  it('returns label "0:30" for window at startMs=30000', () => {
    const result = computeWPMChartData([makeWindow(30000, 100)]);
    expect(result[0].label).toBe('0:30');
  });

  it('returns label "1:00" for window at startMs=60000', () => {
    const result = computeWPMChartData([makeWindow(60000, 110)]);
    expect(result[0].label).toBe('1:00');
  });

  it('returns label "1:30" for window at startMs=90000', () => {
    const result = computeWPMChartData([makeWindow(90000, 130)]);
    expect(result[0].label).toBe('1:30');
  });

  it('returns label "60:00" for window at startMs=3600000', () => {
    const result = computeWPMChartData([makeWindow(3600000, 115)]);
    expect(result[0].label).toBe('60:00');
  });

  it('returns correctly ordered array of { label, wpm } for multiple windows', () => {
    const windows = [
      makeWindow(0, 100),
      makeWindow(30000, 120),
      makeWindow(60000, 110),
    ];
    const result = computeWPMChartData(windows);
    expect(result).toEqual([
      { label: '0:00', wpm: 100 },
      { label: '0:30', wpm: 120 },
      { label: '1:00', wpm: 110 },
    ]);
  });
});
