import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import FillerBreakdown from './FillerBreakdown';

describe('FillerBreakdown (ANAL-04, ANAL-05)', () => {
  it('renders heading "Filler Words"', () => {
    render(<FillerBreakdown events={[]} durationMs={60000} />);
    expect(screen.getByText('Filler Words')).toBeInTheDocument();
  });

  it('shows graceful empty state when no filler events', () => {
    render(<FillerBreakdown events={[]} durationMs={60000} />);
    expect(screen.getByText(/no filler words detected/i)).toBeInTheDocument();
  });

  it('shows per-type counts from event log', () => {
    const events = [
      { type: 'filler_word', timestampMs: 5000, label: 'um' },
      { type: 'filler_word', timestampMs: 10000, label: 'um' },
      { type: 'filler_word', timestampMs: 15000, label: 'uh' },
    ];
    render(<FillerBreakdown events={events} durationMs={60000} />);
    expect(screen.getByText('um')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText('uh')).toBeInTheDocument();
    expect(screen.getByText('1')).toBeInTheDocument();
  });

  it('shows peak third label when fillers present', () => {
    const events = [
      { type: 'filler_word', timestampMs: 70000, label: 'um' },
    ];
    render(<FillerBreakdown events={events} durationMs={90000} />);
    expect(screen.getByText(/closing/i)).toBeInTheDocument();
  });

  it('uses whisperFillers.byType when provided, not event counts', () => {
    // Event log has 1 um; whisperFillers says 3 um + 2 uh
    const events = [
      { type: 'filler_word', timestampMs: 5000, label: 'um' },
    ];
    const whisperFillers = { byType: { um: 3, uh: 2 } };
    render(<FillerBreakdown events={events} durationMs={60000} whisperFillers={whisperFillers} />);
    expect(screen.getByText('3')).toBeInTheDocument(); // Whisper count, not event count (1)
    expect(screen.getByText('uh')).toBeInTheDocument();
  });

  it('shows empty state when whisperFillers.byType is empty record', () => {
    const events = [
      { type: 'filler_word', timestampMs: 5000, label: 'um' },
    ];
    const whisperFillers = { byType: {} };
    render(<FillerBreakdown events={events} durationMs={60000} whisperFillers={whisperFillers} />);
    expect(screen.getByText(/no filler words detected/i)).toBeInTheDocument();
  });
});
