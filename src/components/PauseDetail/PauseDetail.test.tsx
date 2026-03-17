import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import PauseDetail from './PauseDetail';

describe('PauseDetail (ANAL-02)', () => {
  it('renders "No significant pauses detected" when no pause events', () => {
    render(<PauseDetail events={[]} />);
    expect(screen.getByText(/no significant pauses detected/i)).toBeInTheDocument();
  });

  it('renders heading "Pause Analysis"', () => {
    render(<PauseDetail events={[]} />);
    expect(screen.getByText('Pause Analysis')).toBeInTheDocument();
  });

  it('renders total count, average, and longest for session with pauses', () => {
    const events = [
      { type: 'pause_detected', timestampMs: 3000, label: '2.5s pause' },
      { type: 'pause_detected', timestampMs: 8000, label: '4.0s pause' },
    ];
    render(<PauseDetail events={events} />);
    expect(screen.getByText('2')).toBeInTheDocument(); // total
    expect(screen.getByText('3.3s')).toBeInTheDocument(); // avg
    expect(screen.getByText('4.0s')).toBeInTheDocument(); // longest
  });

  it('shows hesitation/deliberate counts when transcript is provided', () => {
    const events = [
      { type: 'pause_detected', timestampMs: 5000, label: '2.5s pause' },
      { type: 'pause_detected', timestampMs: 12000, label: '3.0s pause' },
    ];
    const transcript = [
      { text: 'That is the point.', timestampMs: 4000, isFinal: true },
      { text: 'and then we', timestampMs: 11000, isFinal: true },
    ];
    render(<PauseDetail events={events} transcript={transcript} />);
    expect(screen.getAllByText('1').length).toBeGreaterThanOrEqual(1); // one of the counts
    expect(screen.getByText(/deliberate/i)).toBeInTheDocument();
    expect(screen.getByText(/hesitation/i)).toBeInTheDocument();
  });

  it('omits hesitation/deliberate breakdown when transcript is empty', () => {
    const events = [
      { type: 'pause_detected', timestampMs: 3000, label: '2.5s pause' },
    ];
    render(<PauseDetail events={events} transcript={[]} />);
    expect(screen.queryByText(/deliberate/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/hesitation/i)).not.toBeInTheDocument();
  });
});
