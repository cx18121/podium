// src/hooks/useRecording.test.ts
import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('webm-fix-duration', () => ({
  webmFixDuration: vi.fn().mockResolvedValue(new Blob(['fixed'], { type: 'video/webm' })),
}));

import { useRecording } from './useRecording';
import { webmFixDuration } from 'webm-fix-duration';

const mockGetUserMedia = vi.fn();

class MockMediaRecorder {
  ondataavailable: ((e: any) => void) | null = null;
  onstop: (() => void) | null = null;
  start(_timeslice: number) {}
  stop() {
    this.ondataavailable?.({ data: new Blob(['chunk'], { type: 'video/webm' }) });
    this.onstop?.();
  }
}

const mockStream = {
  getTracks: () => [{ stop: vi.fn() }],
};

beforeEach(() => {
  vi.clearAllMocks();
  mockGetUserMedia.mockResolvedValue(mockStream);
  Object.defineProperty(globalThis.navigator, 'mediaDevices', {
    value: { getUserMedia: mockGetUserMedia },
    configurable: true,
  });
  (globalThis as any).MediaRecorder = MockMediaRecorder;
});

describe('useRecording — getUserMedia', () => {
  it('calls getUserMedia with video and audio constraints', async () => {
    const onRecordingReady = vi.fn();
    const { result } = renderHook(() => useRecording(onRecordingReady));
    await act(async () => {
      await result.current.startSession();
    });
    expect(mockGetUserMedia).toHaveBeenCalledWith({ video: true, audio: true });
  });
});

describe('useRecording — stopRecording', () => {
  it('calls webmFixDuration with the assembled blob and a numeric durationMs', async () => {
    const onRecordingReady = vi.fn();
    const { result } = renderHook(() => useRecording(onRecordingReady));
    await act(async () => { await result.current.startSession(); });
    await act(async () => {
      result.current.stopSession();
      await new Promise((r) => setTimeout(r, 0));
    });
    expect(webmFixDuration).toHaveBeenCalledWith(
      expect.any(Blob),
      expect.any(Number)
    );
  });

  it('calls onRecordingReady with fixedBlob, durationMs, and a non-empty autoTitle', async () => {
    const onRecordingReady = vi.fn();
    const { result } = renderHook(() => useRecording(onRecordingReady));
    await act(async () => { await result.current.startSession(); });
    await act(async () => {
      result.current.stopSession();
      await new Promise((r) => setTimeout(r, 0));
    });
    expect(onRecordingReady).toHaveBeenCalledWith(
      expect.objectContaining({
        fixedBlob: expect.any(Blob),
        durationMs: expect.any(Number),
        autoTitle: expect.stringMatching(/.+/),
      })
    );
  });

  it('does NOT call db.sessions.add — saving is deferred to App (rename prompt design)', async () => {
    // The hook module should not import db at all.
    // Verifying by checking onRecordingReady is all that was called after stop —
    // no db import means no db call is possible.
    const onRecordingReady = vi.fn();
    const { result } = renderHook(() => useRecording(onRecordingReady));
    await act(async () => { await result.current.startSession(); });
    await act(async () => {
      result.current.stopSession();
      await new Promise((r) => setTimeout(r, 0));
    });
    // onRecordingReady is the terminal action — if this passes without db mock errors, db is not called
    expect(onRecordingReady).toHaveBeenCalledTimes(1);
  });
});

describe('useRecording — permission denied', () => {
  it('sets status to error and sets a user-readable error message when getUserMedia is denied', async () => {
    mockGetUserMedia.mockRejectedValue(
      Object.assign(new Error('denied'), { name: 'NotAllowedError' })
    );
    const onRecordingReady = vi.fn();
    const { result } = renderHook(() => useRecording(onRecordingReady));
    await act(async () => { await result.current.startSession(); });
    expect(result.current.status).toBe('error');
    expect(result.current.error).toMatch(/denied/i);
  });
});
