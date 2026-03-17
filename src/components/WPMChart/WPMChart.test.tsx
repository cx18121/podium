// src/components/WPMChart/WPMChart.test.tsx
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import WPMChart from './WPMChart';
import type { WPMWindow } from '../../db/db';

vi.mock('recharts', async (importOriginal) => {
  const actual = await importOriginal<typeof import('recharts')>();
  return {
    ...actual,
    ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
      <div style={{ width: 600, height: 200 }}>{children}</div>
    ),
  };
});

function makeWindow(startMs: number, wpm: number): WPMWindow {
  return { startMs, endMs: startMs + 30000, wpm, wordCount: Math.round(wpm * 0.5) };
}

describe('WPMChart', () => {
  it('renders heading "Speaking Pace" when given valid wpmWindows', () => {
    const windows = [makeWindow(0, 100), makeWindow(30000, 120), makeWindow(60000, 110)];
    render(<WPMChart wpmWindows={windows} />);
    expect(screen.getByText('Speaking Pace')).toBeTruthy();
  });

  it('renders "No data available" when wpmWindows is undefined', () => {
    render(<WPMChart wpmWindows={undefined} />);
    expect(screen.getByText('No data available')).toBeTruthy();
  });

  it('renders "No data available" when wpmWindows is empty', () => {
    render(<WPMChart wpmWindows={[]} />);
    expect(screen.getByText('No data available')).toBeTruthy();
  });

  it('renders chart when given windows (not empty state)', () => {
    const windows = [makeWindow(0, 100), makeWindow(30000, 120), makeWindow(60000, 110)];
    render(<WPMChart wpmWindows={windows} />);
    expect(screen.queryByText('No data available')).toBeNull();
  });

  it('renders for single-window session without error', () => {
    const windows = [makeWindow(0, 100)];
    render(<WPMChart wpmWindows={windows} />);
    expect(screen.getByText('Speaking Pace')).toBeTruthy();
    expect(screen.queryByText('No data available')).toBeNull();
  });
});
