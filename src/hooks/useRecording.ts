// src/hooks/useRecording.ts
import { useCallback, useRef, useState } from 'react';
import { webmFixDuration } from 'webm-fix-duration';

// Intentionally does NOT import db or requestPersistentStorage.
// App owns the Dexie save so it can insert the rename prompt between stop and save.

export type RecordingStatus = 'idle' | 'requesting' | 'recording' | 'processing' | 'error';

export interface RecordingReadyData {
  fixedBlob: Blob;
  durationMs: number;
  autoTitle: string;  // formatAutoTitle() result; used as fallback if user skips rename
}

interface UseRecordingReturn {
  status: RecordingStatus;
  elapsedMs: number;
  error: string | null;
  startSession: () => Promise<void>;
  stopSession: () => void;
}

function formatAutoTitle(): string {
  return new Date().toLocaleString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function useRecording(
  onRecordingReady: (data: RecordingReadyData) => void
): UseRecordingReturn {
  const [status, setStatus] = useState<RecordingStatus>('idle');
  const [elapsedMs, setElapsedMs] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const startTimeRef = useRef<number>(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const stopStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  const startSession = useCallback(async () => {
    setStatus('requesting');
    setError(null);
    setElapsedMs(0);
    chunksRef.current = [];

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });
      streamRef.current = stream;

      const recorder = new MediaRecorder(stream, {
        mimeType: 'video/webm;codecs=vp9,opus',
      });
      recorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = async () => {
        setStatus('processing');
        stopTimer();
        stopStream();

        const durationMs = Date.now() - startTimeRef.current;
        const rawBlob = new Blob(chunksRef.current, { type: 'video/webm' });

        // REC-04: post-process with webm-fix-duration before surfacing to App
        const fixedBlob = await webmFixDuration(rawBlob, durationMs);

        // Hand off to App — App will show the rename prompt, then save to Dexie.
        // Do NOT call db.sessions.add here (locked design: name prompt comes first).
        onRecordingReady({
          fixedBlob,
          durationMs,
          autoTitle: formatAutoTitle(),
        });
      };

      startTimeRef.current = Date.now();
      // Timeslice keeps chunks small; without it the entire recording buffers in memory
      recorder.start(1000);

      timerRef.current = setInterval(() => {
        setElapsedMs(Date.now() - startTimeRef.current);
      }, 500);

      setStatus('recording');
    } catch (err: any) {
      stopStream();
      stopTimer();
      let message = 'Could not access camera or microphone.';
      if (err?.name === 'NotAllowedError' || err?.name === 'PermissionDeniedError') {
        message =
          'Camera and microphone access was denied. To re-enable: click the camera icon in your browser address bar and allow access, then refresh the page.';
      } else if (err?.name === 'NotFoundError') {
        message = 'No camera or microphone found. Please connect a device and try again.';
      } else if (err?.name === 'NotReadableError') {
        message = 'Your camera or microphone is in use by another app. Close other apps and try again.';
      }
      setError(message);
      setStatus('error');
    }
  }, [onRecordingReady, stopTimer, stopStream]);

  const stopSession = useCallback(() => {
    recorderRef.current?.stop();
    // status transitions to 'processing' inside recorder.onstop
  }, []);

  return { status, elapsedMs, error, startSession, stopSession };
}
