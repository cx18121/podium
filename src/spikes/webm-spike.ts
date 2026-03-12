// src/spikes/webm-spike.ts
import { webmFixDuration } from 'webm-fix-duration';
import type { SpikeResult } from './mediapipe-spike';

export async function runWebmSpike(
  stream: MediaStream,
  onUpdate: (result: SpikeResult) => void
): Promise<SpikeResult> {
  onUpdate({ status: 'pending', message: 'Recording 3-second test clip...' });

  return new Promise((resolve) => {
    const chunks: Blob[] = [];
    const startTime = Date.now();

    const recorder = new MediaRecorder(stream, {
      mimeType: 'video/webm;codecs=vp9,opus',
    });

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunks.push(e.data);
    };

    recorder.onstop = async () => {
      const durationMs = Date.now() - startTime;
      const rawBlob = new Blob(chunks, { type: 'video/webm' });

      // Check raw duration (expected: Infinity or NaN)
      const rawUrl = URL.createObjectURL(rawBlob);
      const rawVideo = document.createElement('video');
      rawVideo.src = rawUrl;
      await new Promise((r) => { rawVideo.onloadedmetadata = r; });
      const rawDuration = rawVideo.duration;
      URL.revokeObjectURL(rawUrl);

      onUpdate({ status: 'pending', message: `Raw duration: ${rawDuration} — applying fix...` });

      // Apply fix
      const fixedBlob = await webmFixDuration(rawBlob, durationMs);
      const fixedUrl = URL.createObjectURL(fixedBlob);
      const fixedVideo = document.createElement('video');
      fixedVideo.src = fixedUrl;
      await new Promise((r) => { fixedVideo.onloadedmetadata = r; });
      const fixedDuration = fixedVideo.duration;
      URL.revokeObjectURL(fixedUrl);

      const isFixed = isFinite(fixedDuration) && fixedDuration > 0;
      const result: SpikeResult = {
        status: isFixed ? 'success' : 'error',
        message: isFixed
          ? `Fixed: duration is ${fixedDuration.toFixed(2)}s (was ${rawDuration})`
          : `Fix failed: duration still ${fixedDuration}`,
        detail: `Raw blob: ${rawBlob.size} bytes → Fixed blob: ${fixedBlob.size} bytes`,
      };
      onUpdate(result);
      resolve(result);
    };

    // Record for 3 seconds with 500ms timeslice
    recorder.start(500);
    setTimeout(() => recorder.stop(), 3000);
  });
}
