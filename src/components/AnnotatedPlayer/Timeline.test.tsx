import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import Timeline from './Timeline';
import type { SessionEvent } from '../../db/db';

describe('Timeline', () => {
  const events: SessionEvent[] = [
    { type: 'filler_word', timestampMs: 1000, label: 'um' },
    { type: 'eye_contact_break', timestampMs: 3000 },
    { type: 'face_touch', timestampMs: 5000 },
  ];
  const durationMs = 10000;

  it('renders exactly N buttons when given N events', () => {
    const onSeek = vi.fn();
    render(
      <Timeline
        events={events}
        durationMs={durationMs}
        progressPct={0}
        currentTimeMs={0}
        onSeek={onSeek}
      />
    );
    const buttons = screen.getAllByRole('button');
    expect(buttons).toHaveLength(3);
  });

  it("each button's style.left equals the correct calc value", () => {
    const onSeek = vi.fn();
    render(
      <Timeline
        events={events}
        durationMs={durationMs}
        progressPct={0}
        currentTimeMs={0}
        onSeek={onSeek}
      />
    );
    const buttons = screen.getAllByRole('button');
    expect(buttons[0].style.left).toBe('calc(10% - 1.25px)');
    expect(buttons[1].style.left).toBe('calc(30% - 1.25px)');
    expect(buttons[2].style.left).toBe('calc(50% - 1.25px)');
  });

  it('clicking a marker button calls onSeek with the event timestampMs', () => {
    const onSeek = vi.fn();
    render(
      <Timeline
        events={events}
        durationMs={durationMs}
        progressPct={0}
        currentTimeMs={0}
        onSeek={onSeek}
      />
    );
    const buttons = screen.getAllByRole('button');
    fireEvent.click(buttons[0]);
    expect(onSeek).toHaveBeenCalledWith(1000);
  });

  it('clicking a marker does NOT trigger bar click (stopPropagation)', () => {
    const onSeek = vi.fn();
    render(
      <Timeline
        events={events}
        durationMs={durationMs}
        progressPct={0}
        currentTimeMs={0}
        onSeek={onSeek}
      />
    );
    // clicking the marker should only call onSeek once (with marker timestampMs, not bar fraction)
    const buttons = screen.getAllByRole('button');
    fireEvent.click(buttons[0]);
    expect(onSeek).toHaveBeenCalledTimes(1);
    expect(onSeek).toHaveBeenCalledWith(1000);
  });

  it('each button has the correct aria-label attribute', () => {
    const specificEvents: SessionEvent[] = [
      { type: 'filler_word', timestampMs: 1000, label: 'um' },
      { type: 'eye_contact_break', timestampMs: 2000 },
      { type: 'face_touch', timestampMs: 3000 },
      { type: 'body_sway', timestampMs: 4000 },
      { type: 'pause_detected', timestampMs: 5000, label: '2.3s' },
      { type: 'expressiveness_segment', timestampMs: 6000, label: '0.72' },
    ];
    const onSeek = vi.fn();
    render(
      <Timeline
        events={specificEvents}
        durationMs={10000}
        progressPct={0}
        currentTimeMs={0}
        onSeek={onSeek}
      />
    );
    expect(screen.getByRole('button', { name: 'Filler word: "um"' })).toBeDefined();
    expect(screen.getByRole('button', { name: 'Eye contact break' })).toBeDefined();
    expect(screen.getByRole('button', { name: 'Face touch' })).toBeDefined();
    expect(screen.getByRole('button', { name: 'Body sway' })).toBeDefined();
    expect(screen.getByRole('button', { name: 'Pause: 2.3s' })).toBeDefined();
    expect(screen.getByRole('button', { name: 'Expressiveness: 0.72' })).toBeDefined();
  });

  it('clicking the timeline bar (not a marker) calls onSeek with fraction × durationMs', () => {
    const onSeek = vi.fn();
    render(
      <Timeline
        events={[]}
        durationMs={10000}
        progressPct={0}
        currentTimeMs={0}
        onSeek={onSeek}
      />
    );
    const bar = screen.getByTestId('timeline');
    // mock getBoundingClientRect
    bar.getBoundingClientRect = vi.fn(() => ({
      left: 0,
      width: 100,
      top: 0,
      height: 32,
      right: 100,
      bottom: 32,
      x: 0,
      y: 0,
      toJSON: () => {},
    }));
    fireEvent.click(bar, { clientX: 25 });
    expect(onSeek).toHaveBeenCalledWith(2500); // 0.25 * 10000
  });

  it('the marker nearest to currentTimeMs has an additional highlight class', () => {
    const testEvents: SessionEvent[] = [
      { type: 'filler_word', timestampMs: 2000, label: 'um' },
      { type: 'eye_contact_break', timestampMs: 8000 },
    ];
    const onSeek = vi.fn();
    render(
      <Timeline
        events={testEvents}
        durationMs={10000}
        progressPct={0}
        currentTimeMs={2000}
        onSeek={onSeek}
      />
    );
    const nearBtn = screen.getByRole('button', { name: 'Filler word: "um"' });
    const farBtn = screen.getByRole('button', { name: 'Eye contact break' });
    expect(nearBtn.style.boxShadow).toBeTruthy();
    expect(farBtn.style.boxShadow).toBeFalsy();
  });
});
