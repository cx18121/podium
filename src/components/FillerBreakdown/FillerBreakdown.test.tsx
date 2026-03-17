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

  it('uses Web Speech event counts when whisperFillers is undefined (WHIS-05 fallback)', () => {
    const events = [
      { type: 'filler_word', timestampMs: 1000, label: 'um' },
      { type: 'filler_word', timestampMs: 2000, label: 'uh' },
      { type: 'filler_word', timestampMs: 3000, label: 'um' },
    ];
    render(<FillerBreakdown events={events} durationMs={60000} />);
    // Should show Web Speech counts since whisperFillers is not provided
    expect(screen.getByText('um')).toBeInTheDocument();
    expect(screen.getByText('uh')).toBeInTheDocument();
  });

  it('uses whisperFillers.byType when provided (Whisper overrides Web Speech)', () => {
    const events = [
      { type: 'filler_word', timestampMs: 1000, label: 'um' },
    ];
    const whisperFillers = { byType: { um: 5, uh: 3, like: 2 } };
    render(<FillerBreakdown events={events} durationMs={60000} whisperFillers={whisperFillers} />);
    // Should show Whisper counts (5 um, 3 uh, 2 like) not Web Speech (1 um)
    expect(screen.getByText('5')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
  });

  it('shows empty state when whisperFillers.byType is empty (Whisper found no fillers)', () => {
    const events = [
      { type: 'filler_word', timestampMs: 1000, label: 'um' },
    ];
    const whisperFillers = { byType: {} };
    render(<FillerBreakdown events={events} durationMs={60000} whisperFillers={whisperFillers} />);
    // Whisper empty byType = 0 total => empty state (even though Web Speech found 1)
    expect(screen.getByText('No filler words detected')).toBeInTheDocument();
  });
});
