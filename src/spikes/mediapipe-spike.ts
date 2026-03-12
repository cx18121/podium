// src/spikes/mediapipe-spike.ts
import workerUrl from '../workers/mediapipe.worker.js?url';

export interface SpikeResult {
  status: 'pending' | 'success' | 'error';
  message: string;
  detail?: string;
}

export async function runMediapipeSpike(
  onUpdate: (result: SpikeResult) => void
): Promise<SpikeResult> {
  // CRITICAL: { type: 'classic' } is required — module workers cannot use importScripts
  // Using ?url import (not ?worker) to get URL string without Vite transforming it to module worker
  const worker = new Worker(workerUrl, { type: 'classic' });

  return new Promise((resolve) => {
    const timeout = setTimeout(() => {
      worker.terminate();
      const result: SpikeResult = {
        status: 'error',
        message: 'Worker init timed out after 60s',
      };
      resolve(result);
    }, 60_000);

    worker.onmessage = (e) => {
      if (e.data.type === 'ready') {
        clearTimeout(timeout);
        // Send a cleanup to test that too
        worker.postMessage({ type: 'cleanup' });
      }
      if (e.data.type === 'cleanup_done') {
        worker.terminate();
        const result: SpikeResult = {
          status: 'success',
          message: `All 3 models initialized and cleaned up without error`,
          detail: `Models: ${e.data?.models?.join(', ') ?? 'unknown'}`,
        };
        onUpdate(result);
        resolve(result);
      }
      if (e.data.type === 'error') {
        clearTimeout(timeout);
        worker.terminate();
        const result: SpikeResult = {
          status: 'error',
          message: e.data.message,
          detail: e.data.stack,
        };
        onUpdate(result);
        resolve(result);
      }
    };

    worker.onerror = (e) => {
      clearTimeout(timeout);
      worker.terminate();
      const result: SpikeResult = {
        status: 'error',
        message: `Worker onerror: ${e.message}`,
      };
      onUpdate(result);
      resolve(result);
    };

    onUpdate({ status: 'pending', message: 'Initializing worker and downloading models (~200MB)...' });
    worker.postMessage({ type: 'init' });
  });
}
