import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import AnnotatedPlayer from './AnnotatedPlayer';

beforeEach(() => {
  window.HTMLMediaElement.prototype.play = vi.fn();
  window.HTMLMediaElement.prototype.pause = vi.fn();
});

describe('AnnotatedPlayer', () => {
  it('renders a video element with src equal to the videoUrl prop', () => {
    render(
      <AnnotatedPlayer videoUrl="blob:test-url" durationMs={10000} events={[]} />
    );
    const videoEl = document.querySelector('video') as HTMLVideoElement;
    expect(videoEl).not.toBeNull();
    expect(videoEl.getAttribute('src')).toBe('blob:test-url');
  });

  it('renders a Timeline component (data-testid="timeline")', () => {
    render(
      <AnnotatedPlayer videoUrl="blob:test-url" durationMs={10000} events={[]} />
    );
    expect(screen.getByTestId('timeline')).toBeDefined();
  });

  it('video element has aria-label="Session playback"', () => {
    render(
      <AnnotatedPlayer videoUrl="blob:test-url" durationMs={10000} events={[]} />
    );
    const videoEl = document.querySelector('video') as HTMLVideoElement;
    expect(videoEl.getAttribute('aria-label')).toBe('Session playback');
  });

  it('highlights the nearest event marker as time updates', () => {
    const events = [{ type: 'filler_word', timestampMs: 5000, label: 'um' }];
    render(<AnnotatedPlayer videoUrl="blob:test-url" durationMs={10000} events={events} />);
    const video = document.querySelector('video') as HTMLVideoElement;
    Object.defineProperty(video, 'currentTime', { value: 5, writable: true });
    Object.defineProperty(video, 'duration', { value: 10, writable: true });
    fireEvent(video, new Event('timeupdate'));
    const markerBtn = screen.getByTitle('Filler word: "um"');
    expect(markerBtn.className).toContain('ring-2');
  });
});
