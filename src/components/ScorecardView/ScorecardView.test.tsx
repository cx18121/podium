import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import ScorecardView from './ScorecardView';
import type { ScorecardResult } from '../../analysis/scorer';

const fixtureScorecard: ScorecardResult = {
  overall: 78,
  dimensions: {
    eyeContact: { score: 82, label: '82 / 100', detail: '3 breaks' },
    fillers: { score: 65, label: '65 / 100', detail: '5 fillers (~1.0/min)' },
    pacing: { score: 100, label: '100 / 100', detail: '130 wpm' },
    expressiveness: { score: 70, label: '70 / 100', detail: '4 segments analyzed' },
    gestures: { score: 84, label: '84 / 100', detail: '2 nervous gestures' },
  },
};

describe('ScorecardView', () => {
  it('renders the overall score number in the DOM', () => {
    render(<ScorecardView scorecard={fixtureScorecard} />);
    expect(screen.getByText('78')).toBeInTheDocument();
  });

  it('renders exactly 5 dimension name labels', () => {
    render(<ScorecardView scorecard={fixtureScorecard} />);
    expect(screen.getByText('Eye Contact')).toBeInTheDocument();
    expect(screen.getByText('Filler Words')).toBeInTheDocument();
    expect(screen.getByText('Pacing')).toBeInTheDocument();
    expect(screen.getByText('Expressiveness')).toBeInTheDocument();
    expect(screen.getByText('Nervous Gestures')).toBeInTheDocument();
  });

  it('each score bar fill div has style.width matching the dimension score%', () => {
    render(<ScorecardView scorecard={fixtureScorecard} />);
    const eyeContactBar = screen.getByRole('meter', { name: 'Eye Contact score' });
    expect(eyeContactBar).toHaveStyle({ width: '82%' });
    const fillersBar = screen.getByRole('meter', { name: 'Filler Words score' });
    expect(fillersBar).toHaveStyle({ width: '65%' });
    const pacingBar = screen.getByRole('meter', { name: 'Pacing score' });
    expect(pacingBar).toHaveStyle({ width: '100%' });
    const expressivenessBar = screen.getByRole('meter', { name: 'Expressiveness score' });
    expect(expressivenessBar).toHaveStyle({ width: '70%' });
    const gesturesBar = screen.getByRole('meter', { name: 'Nervous Gestures score' });
    expect(gesturesBar).toHaveStyle({ width: '84%' });
  });

  it('renders each dimension detail string in the DOM', () => {
    render(<ScorecardView scorecard={fixtureScorecard} />);
    expect(screen.getByText('3 breaks')).toBeInTheDocument();
    expect(screen.getByText('5 fillers (~1.0/min)')).toBeInTheDocument();
    expect(screen.getByText('130 wpm')).toBeInTheDocument();
    expect(screen.getByText('4 segments analyzed')).toBeInTheDocument();
    expect(screen.getByText('2 nervous gestures')).toBeInTheDocument();
  });

  it('renders "Calculating scores..." when scorecard prop is null', () => {
    render(<ScorecardView scorecard={null} />);
    expect(screen.getByText('Calculating scores...')).toBeInTheDocument();
  });

  it('score bar fill has correct aria attributes', () => {
    render(<ScorecardView scorecard={fixtureScorecard} />);
    const eyeContactBar = screen.getByRole('meter', { name: 'Eye Contact score' });
    expect(eyeContactBar).toHaveAttribute('aria-valuenow', '82');
    expect(eyeContactBar).toHaveAttribute('aria-valuemin', '0');
    expect(eyeContactBar).toHaveAttribute('aria-valuemax', '100');
  });
});
