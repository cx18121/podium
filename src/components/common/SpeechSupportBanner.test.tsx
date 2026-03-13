// src/components/common/SpeechSupportBanner.test.tsx
import { render, screen } from '@testing-library/react';
import { describe, it, expect, afterEach } from 'vitest';
import SpeechSupportBanner from './SpeechSupportBanner';

describe('SpeechSupportBanner', () => {
  afterEach(() => {
    delete (window as any).SpeechRecognition;
    delete (window as any).webkitSpeechRecognition;
  });

  it('renders a warning banner when SpeechRecognition is absent from window', () => {
    delete (window as any).SpeechRecognition;
    delete (window as any).webkitSpeechRecognition;
    render(<SpeechSupportBanner />);
    expect(screen.getByRole('status')).toBeInTheDocument();
    expect(screen.getByText(/chrome or edge/i)).toBeInTheDocument();
  });

  it('renders nothing when SpeechRecognition is available', () => {
    (window as any).SpeechRecognition = class {};
    const { container } = render(<SpeechSupportBanner />);
    expect(container.firstChild).toBeNull();
  });
});
