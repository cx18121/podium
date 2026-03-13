// src/components/RecordingScreen/RecordingScreen.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import RecordingScreen from './RecordingScreen';

describe('RecordingScreen', () => {
  it('renders an elapsed timer display', () => {
    render(<RecordingScreen elapsedMs={0} onStop={vi.fn()} />);
    expect(screen.getByText('0:00')).toBeInTheDocument();
  });

  it('formats elapsed time correctly (90 seconds = 1:30)', () => {
    render(<RecordingScreen elapsedMs={90_000} onStop={vi.fn()} />);
    expect(screen.getByText('1:30')).toBeInTheDocument();
  });

  it('renders a Stop button', () => {
    render(<RecordingScreen elapsedMs={0} onStop={vi.fn()} />);
    expect(screen.getByRole('button', { name: /stop/i })).toBeInTheDocument();
  });

  it('does NOT render a video element (camera feed is hidden during recording)', () => {
    render(<RecordingScreen elapsedMs={0} onStop={vi.fn()} />);
    expect(document.querySelector('video')).toBeNull();
  });

  it('calls onStop when Stop button is clicked', () => {
    const onStop = vi.fn();
    render(<RecordingScreen elapsedMs={0} onStop={onStop} />);
    fireEvent.click(screen.getByRole('button', { name: /stop/i }));
    expect(onStop).toHaveBeenCalledOnce();
  });
});
