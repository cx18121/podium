// src/hooks/useMLWorker.ts
import { useRef, useCallback } from 'react';
import workerUrl from '../workers/mediapipe.worker.js?url';
import type { SessionEvent, CalibrationProfile } from '../db/db';

export interface UseMLWorkerReturn {
  startWorker: (videoEl: HTMLVideoElement, profile?: CalibrationProfile) => Promise<void>;
  stopWorker: () => Promise<SessionEvent[]>;
  cleanupWorker: () => void;
}

export function useMLWorker(): UseMLWorkerReturn {
  const workerRef = useRef<Worker | null>(null);
  const frameIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startWorker = useCallback(async (videoEl: HTMLVideoElement, profile?: CalibrationProfile): Promise<void> => {
    // Terminate any existing worker before creating a new one
    if (workerRef.current) {
      workerRef.current.terminate();
      workerRef.current = null;
    }

    const worker = new Worker(workerUrl, { type: 'classic' });
    workerRef.current = worker;

    // Wait for worker to signal ready after model initialization
    await new Promise<void>((resolve, reject) => {
      const onMessage = (e: MessageEvent) => {
        if (e.data.type === 'ready') {
          worker.removeEventListener('message', onMessage);
          resolve();
        } else if (e.data.type === 'error') {
          worker.removeEventListener('message', onMessage);
          reject(new Error(e.data.message));
        }
      };
      worker.addEventListener('message', onMessage);
      worker.postMessage({
        type: 'init',
        ...(profile && {
          gazeThreshold: profile.gazeThreshold,
          faceTouchThreshold: profile.faceTouchThreshold,
          swayThreshold: profile.swayThreshold,
        }),
      });
    });

    // Start frame pump at 150ms intervals (6.7fps)
    // Frames where video is not ready are skipped silently
    frameIntervalRef.current = setInterval(async () => {
      if (!workerRef.current) return;
      if (videoEl.readyState < 2) return; // HAVE_CURRENT_DATA = 2

      try {
        const bitmap = await createImageBitmap(videoEl);
        // Transfer ownership of bitmap to worker — avoids copying ~4MB per frame
        workerRef.current?.postMessage(
          { type: 'frame', bitmap, timestampMs: performance.now() },
          [bitmap]
        );
      } catch {
        // createImageBitmap can fail if video dimensions are 0 — silently skip
      }
    }, 150);
  }, []);

  const stopWorker = useCallback((): Promise<SessionEvent[]> => {
    // Clear frame pump immediately — no new frames after stop
    if (frameIntervalRef.current) {
      clearInterval(frameIntervalRef.current);
      frameIntervalRef.current = null;
    }

    return new Promise<SessionEvent[]>((resolve) => {
      if (!workerRef.current) {
        resolve([]);
        return;
      }

      const worker = workerRef.current;
      const onMessage = (e: MessageEvent) => {
        if (e.data.type === 'events') {
          worker.removeEventListener('message', onMessage);
          resolve(e.data.events as SessionEvent[]);
        }
      };
      worker.addEventListener('message', onMessage);
      worker.postMessage({ type: 'stop' });
    });
  }, []);

  const cleanupWorker = useCallback((): void => {
    if (frameIntervalRef.current) {
      clearInterval(frameIntervalRef.current);
      frameIntervalRef.current = null;
    }

    if (!workerRef.current) return;

    const worker = workerRef.current;
    workerRef.current = null;

    // Give worker 500ms to clean up models, then terminate regardless
    const timeoutId = setTimeout(() => {
      worker.terminate();
    }, 500);

    const onMessage = (e: MessageEvent) => {
      if (e.data.type === 'cleanup_done' || e.data.type === 'cleanup_error') {
        clearTimeout(timeoutId);
        worker.removeEventListener('message', onMessage);
        worker.terminate();
      }
    };
    worker.addEventListener('message', onMessage);
    worker.postMessage({ type: 'cleanup' });
  }, []);

  return { startWorker, stopWorker, cleanupWorker };
}
