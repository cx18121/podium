// src/analysis/wpmChart.ts
// ANAL-06: Converts WPMWindow[] to chart-ready { label, wpm }[] with M:SS time labels.

import type { WPMWindow } from '../db/db';

export interface WPMChartPoint {
  label: string;
  wpm: number;
}

function msToLabel(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

export function computeWPMChartData(windows: WPMWindow[]): WPMChartPoint[] {
  return windows.map(w => ({ label: msToLabel(w.startMs), wpm: w.wpm }));
}
