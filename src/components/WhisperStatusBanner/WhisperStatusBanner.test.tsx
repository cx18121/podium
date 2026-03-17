// src/components/WhisperStatusBanner/WhisperStatusBanner.test.tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import WhisperStatusBanner from './WhisperStatusBanner';

describe('WhisperStatusBanner', () => {
  it('renders downloading message with progress', () => {
    render(<WhisperStatusBanner status="downloading" downloadProgress={45} />);
    expect(screen.getByRole('status')).toBeTruthy();
    expect(screen.getByText(/Downloading speech model \(first time only\).*45%/)).toBeTruthy();
  });

  it('renders downloading message without progress', () => {
    render(<WhisperStatusBanner status="downloading" />);
    expect(screen.getByText(/Downloading speech model \(first time only\)/)).toBeTruthy();
  });

  it('renders pending/analyzing message', () => {
    render(<WhisperStatusBanner status="pending" />);
    expect(screen.getByText(/Analyzing speech for accurate filler detection/)).toBeTruthy();
  });

  it('renders null when complete', () => {
    const { container } = render(<WhisperStatusBanner status="complete" />);
    expect(container.innerHTML).toBe('');
  });

  it('renders null when failed (silent fallback)', () => {
    const { container } = render(<WhisperStatusBanner status="failed" />);
    expect(container.innerHTML).toBe('');
  });

  it('has role="status" and aria-live="polite" for accessibility', () => {
    render(<WhisperStatusBanner status="pending" />);
    const banner = screen.getByRole('status');
    expect(banner.getAttribute('aria-live')).toBe('polite');
  });
});
