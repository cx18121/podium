import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { SparklineChart, computeTrendDirection } from './SparklineChart';

describe('computeTrendDirection', () => {
  it('returns improving when last-3 avg exceeds first-3 avg by more than 5', () => {
    expect(computeTrendDirection([50, 60, 70, 80, 85, 90])).toBe('improving');
  });
  it('returns declining when last-3 avg is more than 5 below first-3 avg', () => {
    expect(computeTrendDirection([90, 80, 70, 60, 55, 50])).toBe('declining');
  });
  it('returns stable for small changes within ±5', () => {
    expect(computeTrendDirection([70, 72, 71, 73, 70, 72])).toBe('stable');
  });
  it('returns stable when fewer than 4 scores', () => {
    expect(computeTrendDirection([75])).toBe('stable');
    expect(computeTrendDirection([])).toBe('stable');
  });
});

describe('SparklineChart', () => {
  it('renders svg path when 2+ scores provided', () => {
    const { container } = render(<SparklineChart scores={[20, 50, 80]} label="Eye Contact" />);
    const path = container.querySelector('path');
    expect(path).not.toBeNull();
    expect(path!.getAttribute('d')).toMatch(/^M/);
  });
  it('renders correct number of circle data points', () => {
    const { container } = render(<SparklineChart scores={[20, 50, 80]} label="Eye Contact" />);
    const circles = container.querySelectorAll('circle');
    expect(circles).toHaveLength(3);
  });
  it('renders empty message when fewer than 2 scores', () => {
    render(<SparklineChart scores={[100]} label="Eye Contact" />);
    expect(screen.getByText('Need more sessions')).toBeTruthy();
  });
  it('renders empty message when scores array is empty', () => {
    render(<SparklineChart scores={[]} label="Eye Contact" />);
    expect(screen.getByText('Need more sessions')).toBeTruthy();
  });
  it('renders the label text below the chart', () => {
    render(<SparklineChart scores={[20, 80]} label="Pacing" />);
    expect(screen.getByText('Pacing')).toBeTruthy();
  });
});
