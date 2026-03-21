import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import WorstMomentsReel from './WorstMomentsReel';
import type { WorstMomentsResult } from '../../analysis/worstMoments';

const allThreeMoments: WorstMomentsResult = {
  longestEyeContactBreak: {
    timestampMs: 83_000,
    label: 'Eye contact break: 8.3s',
    category: 'eye_contact',
  },
  densestFillerCluster: {
    timestampMs: 135_000,
    label: 'Filler cluster: 5 in 30s',
    category: 'filler_cluster',
  },
  biggestSway: {
    timestampMs: 47_000,
    label: 'Body sway detected',
    category: 'body_sway',
  },
};

const noMoments: WorstMomentsResult = {
  longestEyeContactBreak: null,
  densestFillerCluster: null,
  biggestSway: null,
};

// WM-05: All 3 moments non-null
describe('WorstMomentsReel — WM-05 (all 3 moments)', () => {
  it('renders 3 Jump to buttons', () => {
    const onSeek = vi.fn();
    render(<WorstMomentsReel moments={allThreeMoments} onSeek={onSeek} />);
    const buttons = screen.getAllByRole('button', { name: 'Jump to' });
    expect(buttons).toHaveLength(3);
  });

  it('renders Eye contact break label', () => {
    render(<WorstMomentsReel moments={allThreeMoments} onSeek={vi.fn()} />);
    expect(screen.getByText('Eye contact break: 8.3s')).toBeInTheDocument();
  });

  it('renders Filler cluster label', () => {
    render(<WorstMomentsReel moments={allThreeMoments} onSeek={vi.fn()} />);
    expect(screen.getByText('Filler cluster: 5 in 30s')).toBeInTheDocument();
  });

  it('renders Body sway detected label', () => {
    render(<WorstMomentsReel moments={allThreeMoments} onSeek={vi.fn()} />);
    expect(screen.getByText('Body sway detected')).toBeInTheDocument();
  });

  it('calls onSeek with correct timestampMs when first Jump to button is clicked', () => {
    const onSeek = vi.fn();
    render(<WorstMomentsReel moments={allThreeMoments} onSeek={onSeek} />);
    const buttons = screen.getAllByRole('button', { name: 'Jump to' });
    fireEvent.click(buttons[0]);
    // First moment in array order is longestEyeContactBreak
    expect(onSeek).toHaveBeenCalledWith(83_000);
  });
});

// WM-06: All moments null
describe('WorstMomentsReel — WM-06 (all null)', () => {
  it('renders empty state message', () => {
    render(<WorstMomentsReel moments={noMoments} onSeek={vi.fn()} />);
    expect(screen.getByText('No significant issues detected')).toBeInTheDocument();
  });

  it('renders no Jump to buttons', () => {
    render(<WorstMomentsReel moments={noMoments} onSeek={vi.fn()} />);
    expect(screen.queryAllByRole('button', { name: 'Jump to' })).toHaveLength(0);
  });
});

// Partial: only longestEyeContactBreak non-null
describe('WorstMomentsReel — partial (1 moment)', () => {
  const partialMoments: WorstMomentsResult = {
    longestEyeContactBreak: {
      timestampMs: 83_000,
      label: 'Eye contact break: 8.3s',
      category: 'eye_contact',
    },
    densestFillerCluster: null,
    biggestSway: null,
  };

  it('renders exactly 1 Jump to button', () => {
    render(<WorstMomentsReel moments={partialMoments} onSeek={vi.fn()} />);
    expect(screen.getAllByRole('button', { name: 'Jump to' })).toHaveLength(1);
  });

  it('renders Eye contact break text', () => {
    render(<WorstMomentsReel moments={partialMoments} onSeek={vi.fn()} />);
    expect(screen.getByText('Eye contact break: 8.3s')).toBeInTheDocument();
  });

  it('does not render empty state message', () => {
    render(<WorstMomentsReel moments={partialMoments} onSeek={vi.fn()} />);
    expect(screen.queryByText('No significant issues detected')).not.toBeInTheDocument();
  });
});
