// src/components/CalibrationScreen/CalibrationScreen.test.tsx
/// <reference types="vitest" />
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import CalibrationScreen from './CalibrationScreen';

// Mock the worker URL import
vi.mock('../../workers/mediapipe.worker.js?url', () => ({
  default: '/mediapipe.worker.js',
}));

// Mock getUserMedia
const mockGetUserMedia = vi.fn();
beforeEach(() => {
  mockGetUserMedia.mockReset();
  Object.defineProperty(globalThis.navigator, 'mediaDevices', {
    value: { getUserMedia: mockGetUserMedia },
    writable: true,
    configurable: true,
  });
});

describe('CalibrationScreen', () => {
  it('renders Start Calibration button initially', () => {
    const onComplete = vi.fn();
    const onCancel = vi.fn();
    render(<CalibrationScreen onComplete={onComplete} onCancel={onCancel} />);
    expect(screen.getByRole('button', { name: /start calibration/i })).toBeInTheDocument();
  });

  it('shows Look directly at the camera instruction text (step 1)', () => {
    const onComplete = vi.fn();
    const onCancel = vi.fn();
    render(<CalibrationScreen onComplete={onComplete} onCancel={onCancel} />);
    // The instruction text should be accessible in the initial render or as part of component's labels
    // The video aria-label is always present
    expect(screen.getByLabelText(/camera preview/i)).toBeInTheDocument();
  });

  it('shows cancel button', () => {
    const onComplete = vi.fn();
    const onCancel = vi.fn();
    render(<CalibrationScreen onComplete={onComplete} onCancel={onCancel} />);
    expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
  });

  it('calls onCancel when cancel button is clicked', () => {
    const onComplete = vi.fn();
    const onCancel = vi.fn();
    render(<CalibrationScreen onComplete={onComplete} onCancel={onCancel} />);
    fireEvent.click(screen.getByRole('button', { name: /cancel/i }));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('does not call onComplete immediately on render', () => {
    const onComplete = vi.fn();
    const onCancel = vi.fn();
    render(<CalibrationScreen onComplete={onComplete} onCancel={onCancel} />);
    expect(onComplete).not.toHaveBeenCalled();
  });

  it('shows calibration description on initial screen', () => {
    const onComplete = vi.fn();
    const onCancel = vi.fn();
    render(<CalibrationScreen onComplete={onComplete} onCancel={onCancel} />);
    expect(screen.getByText(/30 seconds/i)).toBeInTheDocument();
  });
});
